/**
 * GET /api/holdings?userId=...&market=crypto
 *
 * Returns crypto holdings merged from BOTH stores so a coin shows no matter
 * which one it was written to:
 *   - user_trading_data.spot_crypto_state.positions (spot store / bridge)
 *   - crypto_positions table (portfolio/trade surfaces / bridge mirror)
 * Merged by symbol, preferring the larger quantity (dual-writes keep them equal,
 * so this never double-counts). Read-only; uses the service role.
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

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });
  const userId = new URL(req.url).searchParams.get('userId') || req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });

  const [utdRes, cpRes] = await Promise.all([
    sb.from('user_trading_data').select('spot_crypto_state').eq('user_id', userId).maybeSingle(),
    sb.from('crypto_positions').select('*').eq('user_id', userId),
  ]);

  const bySymbol = new Map<string, { symbol: string; name?: string; quantity: number; avgPrice: number }>();

  for (const p of ((utdRes.data?.spot_crypto_state as any)?.positions || [])) {
    const sym = String(p.symbol || '').toUpperCase();
    if (!sym) continue;
    bySymbol.set(sym, { symbol: sym, name: p.name, quantity: num(p.quantity), avgPrice: num(p.avgBuyPrice ?? p.avgPrice) });
  }
  for (const r of (cpRes.data || [])) {
    const sym = String((r as any).symbol || '').toUpperCase();
    const q = num((r as any).quantity);
    if (!sym || q <= 0) continue;
    const existing = bySymbol.get(sym);
    if (!existing || q >= existing.quantity) {
      bySymbol.set(sym, { symbol: sym, name: existing?.name || sym, quantity: q, avgPrice: num((r as any).avg_buy_price ?? (r as any).average_price) });
    }
  }

  const holdings = [...bySymbol.values()]
    .filter(h => h.quantity > 1e-9)
    .map(h => ({ ...h, value: h.quantity * h.avgPrice }));

  return NextResponse.json({ ok: true, holdings });
}
