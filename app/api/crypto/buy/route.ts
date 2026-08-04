/**
 * POST /api/crypto/buy   { userId, symbol, name, usdAmount, price }
 * Buys `usdAmount` of a coin: deducts cash, adds to the user's crypto holdings
 * (user_trading_data.spot_crypto_state — where the app + /api/holdings read),
 * and logs a trade row so the notification triggers fire. Sells: side='sell'.
 */
import { NextRequest, NextResponse } from 'next/server';
import { emailUser } from '@/lib/email/events';
import { requireFeature } from '@/lib/tier-guard';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });

  const { userId, symbol, name, usdAmount, price, side = 'buy' } = await req.json().catch(() => ({} as any));
  const sym = String(symbol || '').toUpperCase();
  const px = num(price);
  const usd = num(usdAmount);
  if (!userId || !sym || px <= 0 || usd <= 0) {
    return NextResponse.json({ ok: false, error: 'userId, symbol, price, usdAmount required' }, { status: 400 });
  {
    const _gate = await requireFeature(String(userId || ''), 'trading');
    if (!_gate.ok) return NextResponse.json({ ok: false, error: _gate.error, code: 'TIER_REQUIRED' }, { status: _gate.status || 403 });
  }
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

  await sb.from('user_trading_data')
    .upsert({ user_id: userId, spot_crypto_state: { ...state, positions }, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

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
      { label: 'Price', value: `$${px.toLocaleString()}` },
      { label: 'Quantity', value: `${qty.toFixed(6)} ${sym}` },
    ],
    ctaText: 'View holdings', ctaUrl: (process.env.NEXT_PUBLIC_APP_URL || '') + '/dashboard/crypto',
  });

  return NextResponse.json({ ok: true, symbol: sym, side, quantity: qty, price: px, usd, balance: newBal });
}
