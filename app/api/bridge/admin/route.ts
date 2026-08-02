/**
 * SWIFTBRIDGE — Admin actions
 *
 * POST /api/bridge/admin
 * Body: { action: 'respond' | 'approve' | 'reject', request_id, ... }
 *
 * NOTE: This relies on the existing admin auth flow used elsewhere
 * in the codebase (cookie/session-based). Falls back to checking
 * users.is_admin via the request user header if present.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function isAdmin(req: NextRequest): Promise<{ ok: boolean; adminId?: string }> {
  // Strategy 1: x-admin-id header (set by admin UI store) — verify it
  const adminId =
    req.headers.get('x-admin-id') ||
    req.headers.get('x-user-id'); // fallback

  if (adminId) {
    const { data: u } = await supabaseAdmin
      .from('users')
      .select('id, is_admin, role')
      .eq('id', adminId)
      .maybeSingle();
    if (u && (u.is_admin === true || u.role === 'admin')) {
      return { ok: true, adminId: u.id };
    }
  }
  return { ok: false };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await isAdmin(req);
    if (!auth.ok) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 403 });
    }
    const adminId = auth.adminId!;

    const body = await req.json();
    const { action, request_id } = body || {};
    if (!action || !request_id) {
      return NextResponse.json({ error: 'Missing action or request_id' }, { status: 400 });
    }

    const { data: request, error: getErr } = await supabaseAdmin
      .from('bridge_requests')
      .select('*')
      .eq('id', request_id)
      .maybeSingle();

    if (getErr || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // ────────────────── RESPOND ──────────────────
    if (action === 'respond') {
      if (request.status !== 'awaiting_admin') {
        return NextResponse.json(
          { error: `Cannot respond — request is in '${request.status}' state` },
          { status: 400 },
        );
      }
      const { payment_details } = body;
      if (!payment_details || typeof payment_details !== 'object') {
        return NextResponse.json({ error: 'payment_details required' }, { status: 400 });
      }

      const { data: updated, error } = await supabaseAdmin
        .from('bridge_requests')
        .update({
          admin_id: adminId,
          admin_payment_details: payment_details,
          admin_responded_at: new Date().toISOString(),
          status: 'awaiting_payment',
        })
        .eq('id', request_id)
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Notify user
      await supabaseAdmin.from('user_notifications').insert({
        user_id: request.user_id,
        type: 'bridge.responded',
        title: 'SwiftBridge — payout details ready',
        body: 'Your bridge request has been accepted. Open it to see payment instructions.',
        data: { request_id },
      });

      return NextResponse.json({ success: true, request: updated });
    }

    // ────────────────── APPROVE & CREDIT ──────────────────
    if (action === 'approve') {
      if (request.status !== 'awaiting_verification') {
        return NextResponse.json(
          { error: `Cannot approve — request is in '${request.status}' state` },
          { status: 400 },
        );
      }
      const credit_usd = parseFloat(body.credited_amount_usd ?? request.estimated_credit_usd);
      if (!Number.isFinite(credit_usd) || credit_usd <= 0) {
        return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 });
      }

      // Mark approved
      const { data: updated, error } = await supabaseAdmin
        .from('bridge_requests')
        .update({
          credited_amount_usd: credit_usd,
          credited_asset: body.credited_asset || request.target_asset || 'USDT',
          credited_amount: credit_usd,
          admin_notes: body.admin_notes || null,
          status: 'completed',
        })
        .eq('id', request_id)
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // SwiftBridge now credits CRYPTO (the chosen target_asset), not USD.
      // The tg_bridge_credit_crypto DB trigger adds it to the user's crypto
      // holdings when status becomes 'completed', which tops their dashboard.
      const balErr = null;

      // Notify user
      await supabaseAdmin.from('user_notifications').insert({
        user_id: request.user_id,
        type: 'bridge.completed',
        title: 'SwiftBridge — completed',
        body: `Credited $${credit_usd.toFixed(2)} ${updated.credited_asset || 'USDT'} to your balance.`,
        data: { request_id, amount: credit_usd },
      });

      return NextResponse.json({ success: true, request: updated });
    }

    // ────────────────── REJECT ──────────────────
    if (action === 'reject') {
      const { data: updated, error } = await supabaseAdmin
        .from('bridge_requests')
        .update({
          admin_notes: body.admin_notes || 'Rejected by admin',
          status: 'rejected',
        })
        .eq('id', request_id)
        .select('*')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabaseAdmin.from('user_notifications').insert({
        user_id: request.user_id,
        type: 'bridge.rejected',
        title: 'SwiftBridge — request declined',
        body: body.admin_notes || 'Your bridge request was declined.',
        data: { request_id },
      });

      return NextResponse.json({ success: true, request: updated });
    }

    return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 });
  } catch (err: any) {
    console.error('[bridge/admin]', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
