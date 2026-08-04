/**
 * Admin: view & edit a user's positions.
 *
 * GET  /api/admin/users/[id]/positions
 *   -> { crypto: [{symbol, quantity, avgPrice}], stocks: [{symbol, quantity, avgPrice}] }
 *
 * POST /api/admin/users/[id]/positions
 *   body: { kind: 'crypto'|'stock', symbol, quantity, avgPrice, remove? }
 *   - crypto: writes BOTH user_trading_data.spot_crypto_state AND crypto_positions
 *   - stock:  writes positions
 *   remove:true deletes the position.
 */
import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'service role not configured' }, { status: 503 });
  const { id: userId } = await ctx.params;

  const [utd, cp, pos] = await Promise.all([
    sb.from('user_trading_data').select('spot_crypto_state').eq('user_id', userId).maybeSingle(),
    sb.from('crypto_positions').select('symbol, quantity, avg_buy_price').eq('user_id', userId),
    sb.from('positions').select('symbol, quantity, avg_price, average_price').eq('user_id', userId),
  ]);

  const cryptoMap = new Map<string, { symbol: string; quantity: number; avgPrice: number }>();
  for (const p of ((utd.data?.spot_crypto_state as any)?.positions || [])) {
    const s = String(p.symbol || '').toUpperCase();
    if (s) cryptoMap.set(s, { symbol: s, quantity: num(p.quantity), avgPrice: num(p.avgBuyPrice ?? p.avgPrice) });
  }
  for (const r of (cp.data || [])) {
    const s = String((r as any).symbol || '').toUpperCase();
    if (s && !cryptoMap.has(s)) cryptoMap.set(s, { symbol: s, quantity: num((r as any).quantity), avgPrice: num((r as any).avg_buy_price) });
  }

  const stocks = (pos.data || []).map((r: any) => ({
    symbol: String(r.symbol).toUpperCase(), quantity: num(r.quantity), avgPrice: num(r.avg_price ?? r.average_price),
  }));

  return NextResponse.json({ ok: true, crypto: [...cryptoMap.values()], stocks });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'service role not configured' }, { status: 503 });
  const { id: userId } = await ctx.params;
  const { kind, symbol, quantity, avgPrice, remove } = await req.json().catch(() => ({} as any));

  const sym = String(symbol || '').toUpperCase();
  if (!sym) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  const qty = num(quantity);
  const avg = num(avgPrice);

  if (kind === 'crypto') {
    // user_trading_data.spot_crypto_state
    await sb.from('user_trading_data').insert({ user_id: userId }).then(() => {}, () => {});
    const { data: utd } = await sb.from('user_trading_data').select('spot_crypto_state').eq('user_id', userId).maybeSingle();
    const state: any = utd?.spot_crypto_state || {};
    let positions: any[] = Array.isArray(state.positions) ? state.positions : [];
    positions = positions.filter(p => String(p.symbol).toUpperCase() !== sym);
    if (!remove && qty > 0) positions.push({ symbol: sym, name: sym, quantity: qty, avgBuyPrice: avg });
    await sb.from('user_trading_data').upsert(
      { user_id: userId, spot_crypto_state: { ...state, positions }, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' });

    // crypto_positions mirror
    if (remove || qty <= 0) {
      await sb.from('crypto_positions').delete().eq('user_id', userId).eq('symbol', sym);
    } else {
      await sb.from('crypto_positions').upsert(
        { user_id: userId, symbol: sym, quantity: qty, avg_buy_price: avg, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,symbol' });
    }
  } else {
    // stock
    if (remove || qty <= 0) {
      await sb.from('positions').delete().eq('user_id', userId).eq('symbol', sym);
    } else {
      await sb.from('positions').upsert(
        { user_id: userId, symbol: sym, quantity: qty, avg_price: avg, average_price: avg, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,symbol' });
    }
  }

  return NextResponse.json({ ok: true, kind, symbol: sym, quantity: remove ? 0 : qty, avgPrice: avg });
}
