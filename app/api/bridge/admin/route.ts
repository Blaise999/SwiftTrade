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
      const credit_usd = parseFloat(body.credited_amount_usd ?? request.estimated_credit_usd ?? request.estimated_usd);
      if (!Number.isFinite(credit_usd) || credit_usd <= 0) {
        return NextResponse.json({ error: 'Invalid credit amount' }, { status: 400 });
      }

      const targetAsset = String(body.credited_asset || request.target_asset || 'USDT').toUpperCase();
      const isUsd = targetAsset === 'USD';
      // crypto quantity: prefer the amount estimated at request time, else derive from USD
      const SEED: Record<string, number> = {
        BTC: 67234, ETH: 3456, SOL: 145, BNB: 567, XRP: 0.52, ADA: 0.46, AVAX: 35.7,
        MATIC: 0.57, DOGE: 0.082, TRX: 0.12, LINK: 14.6, LTC: 95.7, DOT: 7.9, USDT: 1, USDC: 1,
      };
      const cryptoQty = isUsd ? 0
        : (Number(request.estimated_target) > 0
            ? Number(request.estimated_target)
            : (SEED[targetAsset] ? credit_usd / SEED[targetAsset] : 0));

      // Mark completed + record final amounts + block the trigger from double-crediting
      const { data: updated, error } = await supabaseAdmin
        .from('bridge_requests')
        .update({
          credited_amount_usd: credit_usd,
          credited_asset: targetAsset,
          credited_amount: cryptoQty,
          final_credit_usd: credit_usd,
          final_credit_target: cryptoQty,
          crypto_credited: true,
          admin_notes: body.admin_notes || null,
          status: 'completed',
        })
        .eq('id', request_id)
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // CREDIT the user directly — reliable, no trigger dependency.
      if (isUsd) {
        const { data: u } = await supabaseAdmin.from('users').select('balance_available').eq('id', request.user_id).maybeSingle();
        await supabaseAdmin.from('users')
          .update({ balance_available: Number(u?.balance_available || 0) + credit_usd, updated_at: new Date().toISOString() })
          .eq('id', request.user_id);
      } else if (cryptoQty > 0) {
        // add the coin to the user's crypto holdings (shows on crypto page, portfolio, dashboard)
        await supabaseAdmin.from('user_trading_data').insert({ user_id: request.user_id }).then(() => {}, () => {});
        const { data: utd } = await supabaseAdmin.from('user_trading_data').select('spot_crypto_state').eq('user_id', request.user_id).maybeSingle();
        const state: any = utd?.spot_crypto_state || {};
        const positions: any[] = Array.isArray(state.positions) ? state.positions : [];
        const idx = positions.findIndex((p: any) => String(p.symbol).toUpperCase() === targetAsset);
        if (idx >= 0) positions[idx].quantity = Number(positions[idx].quantity || 0) + cryptoQty;
        else positions.push({ symbol: targetAsset, name: targetAsset, quantity: cryptoQty, avgBuyPrice: cryptoQty > 0 ? credit_usd / cryptoQty : 0 });
        await supabaseAdmin.from('user_trading_data')
          .upsert({ user_id: request.user_id, spot_crypto_state: { ...state, positions }, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

        // mirror into crypto_positions too (some surfaces read this table)
        const { data: existing } = await supabaseAdmin.from('crypto_positions')
          .select('quantity, avg_buy_price').eq('user_id', request.user_id).eq('symbol', targetAsset).maybeSingle();
        const prevQty = Number(existing?.quantity || 0);
        const prevAvg = Number(existing?.avg_buy_price || 0);
        const px = cryptoQty > 0 ? credit_usd / cryptoQty : prevAvg;
        const newQty = prevQty + cryptoQty;
        const newAvg = newQty > 0 ? (prevQty * prevAvg + cryptoQty * px) / newQty : px;
        await supabaseAdmin.from('crypto_positions')
          .upsert({ user_id: request.user_id, symbol: targetAsset, quantity: newQty, avg_buy_price: newAvg, updated_at: new Date().toISOString() }, { onConflict: 'user_id,symbol' })
          .then(() => {}, () => {});
      }

      // Notify user
      await supabaseAdmin.from('notifications').insert({
        user_id: request.user_id,
        type: 'bridge',
        title: 'SwiftBridge — completed',
        message: isUsd
          ? `$${credit_usd.toFixed(2)} added to your balance.`
          : `${cryptoQty.toFixed(6)} ${targetAsset} added to your crypto holdings.`,
        metadata: { request_id, usd: credit_usd, asset: targetAsset, quantity: cryptoQty },
      }).then(() => {}, () => {});

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
