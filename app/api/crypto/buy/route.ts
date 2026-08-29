/**
 * POST /api/crypto/buy   { userId, symbol, name, usdAmount, price }
 * Buys `usdAmount` of a coin: deducts cash, adds to the user's crypto holdings
 * (user_trading_data.spot_crypto_state — where the app + /api/holdings read),
 * and logs a trade row so the notification triggers fire. Sells: side='sell'.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { trace, traceError } from '@/lib/trace';
import { emailUser } from '@/lib/email/events';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  return supabaseAdmin();
}
/** Format a price without collapsing sub-cent coins (PEPE, SHIB) to "$0". */
function fmtPx(p: number): string {
  if (!Number.isFinite(p) || p <= 0) return '0';
  if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 0.01) return p.toFixed(4);
  return p.toPrecision(4);   // 0.000002650
}

const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

// TRACE-INSTRUMENTED
export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });

  const { userId, symbol, name, usdAmount, price, side = 'buy' } = await req.json().catch(() => ({} as any));
  const sym = String(symbol || '').toUpperCase();
  trace('crypto/buy', 'request', { userId, sym, side, usdAmount, price });
  const px = num(price);
  const usd = num(usdAmount);
  if (!userId || !sym || px <= 0 || usd <= 0) {
    return NextResponse.json({ ok: false, error: 'userId, symbol, price, usdAmount required' }, { status: 400 });
  }
  const qty = usd / px;

  // balance
  const { data: u } = await sb.from('users').select('balance_available').eq('id', userId).maybeSingle();
  const bal = num(u?.balance_available);
  if (side === 'buy' && bal < usd) {
    return NextResponse.json({ ok: false, error: 'Insufficient balance' }, { status: 400 });
  }

  // holdings state
  await sb.from('user_trading_data').insert({ user_id: userId }).select().maybeSingle().then(() => {}, () => {});
  const { data: utd } = await sb.from('user_trading_data').select('spot_crypto_state').eq('user_id', userId).maybeSingle();
  // crypto_positions is the source of truth — seed from it so a missing/legacy
  // spot_crypto_state column can never wipe or hide existing holdings.
  const { data: cpRows } = await sb.from('crypto_positions').select('symbol, quantity, avg_buy_price').eq('user_id', userId);
  const state: any = utd?.spot_crypto_state || {};
  const positions: any[] = Array.isArray(state.positions) ? state.positions : [];

  const idx = positions.findIndex(p => String(p.symbol).toUpperCase() === sym);
  if (side === 'buy') {
    if (idx >= 0) {
      const cur = positions[idx];
      const newQty = num(cur.quantity) + qty;
      const newAvg = (num(cur.quantity) * num(cur.avgBuyPrice) + qty * px) / (newQty || 1);
      positions[idx] = { ...cur, quantity: newQty, avgBuyPrice: newAvg };
    } else {
      positions.push({ symbol: sym, name: name || sym, quantity: qty, avgBuyPrice: px });
    }
  } else {
    if (idx < 0 || num(positions[idx].quantity) < qty) {
      return NextResponse.json({ ok: false, error: 'Not enough to sell' }, { status: 400 });
    }
    positions[idx].quantity = num(positions[idx].quantity) - qty;
    if (positions[idx].quantity <= 1e-9) positions.splice(idx, 1);
  }

  const { error: stateErr } = await sb.from('user_trading_data')
    .upsert({ user_id: userId, spot_crypto_state: { ...state, positions }, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  // mirror into crypto_positions too, so /api/portfolio and other surfaces see it
  const finalPos = positions.find(p => String(p.symbol).toUpperCase() === sym);
  if (finalPos && Number(finalPos.quantity) > 1e-9) {
    const { error: cpErr } = await sb.from('crypto_positions').upsert({
      user_id: userId, symbol: sym,
      quantity: Number(finalPos.quantity),
      avg_buy_price: Number(finalPos.avgBuyPrice) || px,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,symbol' });
    // CRITICAL: if BOTH stores failed, the holding doesn't exist — don't charge.
    trace('crypto/buy', 'writes', { stateErr: stateErr?.message || null, cpErr: cpErr?.message || null });
  if (stateErr && cpErr) {
      return NextResponse.json({
        ok: false,
        error: `Holding could not be saved: ${cpErr.message}. Balance was not charged. (Run sql/FIX_TRADING_PERSISTENCE.sql if columns/tables are missing.)`,
        code: 'POSITION_WRITE_FAILED',
      }, { status: 500 });
    }
  } else {
    // fully sold — remove it
    await sb.from('crypto_positions').delete().eq('user_id', userId).eq('symbol', sym).then(() => {}, () => {});
  }

  // balance move
  const newBal = side === 'buy' ? bal - usd : bal + usd;
  await sb.from('users').update({ balance_available: newBal, updated_at: new Date().toISOString() }).eq('id', userId);

  // trade log (fires notification trigger)
  await sb.from('trades').insert({
    user_id: userId, symbol: sym, market_type: 'crypto', type: side, side: side === 'buy' ? 'long' : 'short',
    amount: usd, quantity: qty, entry_price: px, current_price: px, status: 'closed',
    source: 'spot', opened_at: new Date().toISOString(), closed_at: new Date().toISOString(),
  }).then(() => {}, () => {});

  emailUser(userId, {
    title: `${side === 'buy' ? 'Bought' : 'Sold'} ${sym}`,
    tone: side === 'buy' ? 'success' : 'default',
    message: `You ${side === 'buy' ? 'bought' : 'sold'} ${qty.toFixed(6)} ${sym} for $${usd.toFixed(2)}.`,
    rows: [
      { label: 'Amount', value: `$${usd.toFixed(2)}` },
      { label: 'Price', value: `$${fmtPx(px)}` },
      { label: 'Quantity', value: `${qty.toFixed(6)} ${sym}` },
    ],
    ctaText: 'View holdings', ctaUrl: (process.env.NEXT_PUBLIC_APP_URL || '') + '/dashboard/crypto',
  });

  // history (transactions) + in-app notification
  const { error: txErr } = await sb.from('transactions').insert({
    user_id: userId, type: side === 'buy' ? 'buy' : 'sell', status: 'completed',
    amount: usd, currency: 'USD', symbol: sym, quantity: qty, price: px,
    description: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty.toFixed(6)} ${sym}`,
    metadata: { market: 'crypto', symbol: sym, side, quantity: qty, price: px },
  });
  if (txErr) traceError('crypto/buy', 'transactions insert', txErr);
  else trace('crypto/buy', 'transactions insert ok');
  await sb.from('notifications').insert({
    user_id: userId, type: side === 'buy' ? 'buy' : 'sell',
    title: `${side === 'buy' ? 'Bought' : 'Sold'} ${sym}`,
    message: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty.toFixed(6)} ${sym} for $${usd.toFixed(2)} at $${fmtPx(px)}.`,
    metadata: { market: 'crypto', symbol: sym, side, usd, price: px },
  }).then(() => {}, () => {});

  return NextResponse.json({
    ok: true, symbol: sym, side, quantity: qty, price: px, usd, balance: newBal,
    warnings: [
      stateErr ? `spot state: ${stateErr.message}` : null,
      txErr ? `activity row: ${txErr.message}` : null,
    ].filter(Boolean),
  });
}
