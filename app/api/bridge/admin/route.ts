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

      // Credit the user balance
      const { error: balErr } = await supabaseAdmin.rpc('credit_user_usd', {
        p_user: request.user_id,
        p_amount: credit_usd,
      });

      if (balErr) {
        // Fallback: direct update if RPC missing
        await supabaseAdmin
          .from('users')
          .update({
            balance_available: (
              await supabaseAdmin.from('users').select('balance_available').eq('id', request.user_id).maybeSingle()
            ).data?.balance_available + credit_usd,
            updated_at: new Date().toISOString(),
          })
          .eq('id', request.user_id);
      }

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

    // ────────────────── SEND_ACCOUNT (admin gives deposit account to user) ──────────────────
    if (action === 'send_account') {
      const { account, instructions } = body;
      if (!account) {
        return NextResponse.json({ error: 'account required' }, { status: 400 });
      }
      const { data: updated, error } = await supabaseAdmin
        .from('bridge_requests')
        .update({
          admin_id: adminId,
          admin_deposit_account: String(account),
          admin_deposit_instructions: String(instructions || ''),
          admin_responded_at: new Date().toISOString(),
          status: 'awaiting_payment',
          workflow_step: 'awaiting_user_payment',
        })
        .eq('id', request_id)
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabaseAdmin.from('user_notifications').insert({
        user_id: request.user_id,
        type: 'bridge.account_sent',
        title: 'SwiftBridge — Deposit account ready',
        body: 'Admin has sent the account to pay into. Open your request to view and upload your receipt + wallet address.',
        data: { request_id, account, instructions },
      });

      return NextResponse.json({ success: true, request: updated });
    }

    // ────────────────── SEND_COINS (admin paid the user's wallet) ──────────────────
    if (action === 'send_coins') {
      const { payout_tx } = body;
      if (!payout_tx) {
        return NextResponse.json({ error: 'payout_tx (transaction hash) required' }, { status: 400 });
      }
      if (!request.user_wallet_address) {
        return NextResponse.json(
          { error: 'User has not submitted their wallet address yet' },
          { status: 400 },
        );
      }

      const { data: updated, error } = await supabaseAdmin
        .from('bridge_requests')
        .update({
          admin_id: adminId,
          admin_payout_tx: String(payout_tx),
          admin_payout_at: new Date().toISOString(),
          status: 'completed',
          workflow_step: 'completed',
        })
        .eq('id', request_id)
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      await supabaseAdmin.from('user_notifications').insert({
        user_id: request.user_id,
        type: 'bridge.completed',
        title: 'SwiftBridge — Coins sent',
        body: `Your ${request.target_asset || 'crypto'} has been sent. Tx: ${String(payout_tx).slice(0, 16)}…`,
        data: { request_id, payout_tx },
      });

      return NextResponse.json({ success: true, request: updated });
    }

    return NextResponse.json({ error: `Unknown action '${action}'` }, { status: 400 });
  } catch (err: any) {
    console.error('[bridge/admin]', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

// ────────────────── GET — list all bridge requests for admin ──────────────────
export async function GET(req: NextRequest) {
  const auth = await isAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');

  let query = supabaseAdmin
    .from('bridge_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Hydrate user emails (separate query to avoid FK-name issues)
  const userIds = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean)));
  let emailMap: Record<string, string> = {};
  if (userIds.length) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .in('id', userIds);
    for (const u of users || []) emailMap[(u as any).id] = (u as any).email;
  }

  const rows = (data || []).map((r: any) => ({ ...r, user_email: emailMap[r.user_id] || null }));
  return NextResponse.json({ ok: true, requests: rows });
}
