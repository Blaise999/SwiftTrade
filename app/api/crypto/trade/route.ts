/**
 * POST /api/crypto/trade   (header: x-user-id)
 * Body: { symbol, side: 'buy'|'sell', amountType: 'notional'|'qty', amount, price }
 *
 * Balance-safe crypto buy/sell that moves the SAME ledger everything else reads:
 *   buy  → deduct users.balance_available, upsert crypto_positions
 *   sell → credit users.balance_available, reduce/close crypto_positions
 *
 * Mirrors the proven /api/invest/order flow so crypto and equities behave
 * identically and the dashboard total stays consistent. `price` is the live
 * price the client is showing (same contract as invest/order); a stricter demo
 * can re-fetch server-side from /api/market/prices before settling.
 *
 * Money-safe note: read-modify-write, fine for demo volume. For production,
 * move this into a Postgres function / RPC so the balance check + deduct are
 * one atomic transaction.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const num = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });

  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ ok: false, error: 'x-user-id required' }, { status: 400 });

  const body = await req.json().catch(() => ({} as any));
  const symbol = String(body?.symbol || '').toUpperCase();
  const side = body?.side === 'sell' ? 'sell' : 'buy';
  const amountType = body?.amountType === 'qty' ? 'qty' : 'notional';
  const amount = num(body?.amount);
  const price = num(body?.price);

  if (!symbol || amount <= 0 || price <= 0) {
    return NextResponse.json({ ok: false, error: 'symbol, amount, price required' }, { status: 400 });
  }

  const qty = amountType === 'notional' ? amount / price : amount;
  const cost = amountType === 'notional' ? amount : qty * price;

  // ── Load cash ──
  const { data: u, error: uErr } = await sb
    .from('users')
    .select('balance_available')
    .eq('id', userId)
    .single();
  if (uErr || !u) return NextResponse.json({ ok: false, error: 'user not found' }, { status: 404 });
  const bal = num(u.balance_available);

  // ── Load existing position ──
  const { data: existing } = await sb
    .from('crypto_positions')
    .select('id, quantity, average_price, total_cost_basis')
    .eq('user_id', userId)
    .eq('symbol', symbol)
    .maybeSingle();

  if (side === 'buy') {
    if (cost > bal) {
      return NextResponse.json(
        { ok: false, error: 'insufficient balance', needed: cost, available: bal },
        { status: 400 },
      );
    }

    if (existing) {
      const prevQty = num(existing.quantity);
      const prevTcb = num(existing.total_cost_basis);
      const newQty = prevQty + qty;
      const newTcb = prevTcb + cost;
      const newAvg = newQty > 0 ? newTcb / newQty : price;
      await sb
        .from('crypto_positions')
        .update({ quantity: newQty, average_price: newAvg, total_cost_basis: newTcb })
        .eq('id', existing.id);
    } else {
      await sb.from('crypto_positions').insert({
        user_id: userId,
        symbol,
        quantity: qty,
        average_price: price,
        total_cost_basis: cost,
      });
    }

    await sb.from('users').update({ balance_available: bal - cost }).eq('id', userId);
  } else {
    // sell
    if (!existing || num(existing.quantity) <= 0) {
      return NextResponse.json({ ok: false, error: 'no position to sell' }, { status: 400 });
    }
    const prevQty = num(existing.quantity);
    const sellQty = Math.min(qty, prevQty);
    const proceeds = sellQty * price;
    const remaining = prevQty - sellQty;

    if (remaining <= 1e-9) {
      await sb.from('crypto_positions').delete().eq('id', existing.id);
    } else {
      // reduce cost basis proportionally; average_price unchanged on a sell
      const prevTcb = num(existing.total_cost_basis);
      const newTcb = prevTcb * (remaining / prevQty);
      await sb
        .from('crypto_positions')
        .update({ quantity: remaining, total_cost_basis: newTcb })
        .eq('id', existing.id);
    }

    await sb.from('users').update({ balance_available: bal + proceeds }).eq('id', userId);
  }

  // ── Audit trail (best-effort) ──
  try {
    await sb.from('transactions').insert({
      user_id: userId,
      type: side === 'buy' ? 'crypto_buy' : 'crypto_sell',
      amount: side === 'buy' ? cost : qty * price,
      description: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty.toFixed(8)} ${symbol} @ ${price}`,
      reference_type: 'crypto_trade',
      status: 'completed',
    });
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({
    ok: true,
    side,
    symbol,
    qty,
    price,
    cost: side === 'buy' ? cost : qty * price,
    settledAt: new Date().toISOString(),
  });
}
