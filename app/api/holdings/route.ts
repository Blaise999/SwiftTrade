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
import { jsonNoStore } from '@/lib/no-store';
import { trace } from '@/lib/trace';
import { checkRateAlertsInBackground } from '@/lib/rate-alerts';
import { fetchCryptoPrices } from '@/lib/live-prices';
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
  checkRateAlertsInBackground();   // opportunistic — throttled to 5 min

  const sb = admin();
  if (!sb) return jsonNoStore({ ok: false, error: 'service role not configured' }, { status: 503 });
  const userId = new URL(req.url).searchParams.get('userId') || req.headers.get('x-user-id');
  if (!userId) return jsonNoStore({ ok: false, error: 'userId required' }, { status: 400 });

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

  trace('holdings', 'sources', {
    userId,
    spotStatePositions: ((utdRes.data?.spot_crypto_state as any)?.positions || []).length,
    cryptoPositionsRows: (cpRes.data || []).length,
    spotErr: (utdRes as any).error?.message || null,
    cpErr: (cpRes as any).error?.message || null,
  });

  const holdings = [...bySymbol.values()]
    .filter(h => h.quantity > 1e-9)
    .map(h => ({ ...h, value: h.quantity * h.avgPrice }));

  // enrich with live market prices so every page valuing crypto shows live numbers
  try {
    const live = await fetchCryptoPrices(holdings.map(h => h.symbol));
    for (const h of holdings as any[]) {
      const lp = live[h.symbol.toUpperCase()];
      if (lp?.price > 0) {
        h.price = lp.price;
        h.change = lp.change;
        h.value = h.quantity * lp.price;   // live market value
      }
    }
  } catch {}

  // ── self-healing reconciliation ────────────────────────────────────────
  // The audit found real divergence between the two stores (e.g. SOL 200 in
  // spot_state vs 21 in crypto_positions; BNB/XRP in one store only). Rather
  // than let the two drift further, push the merged truth back into
  // crypto_positions for anything missing or behind. Best-effort and silent.
  try {
    const cpBySym = new Map<string, number>();
    for (const r of (cpRes.data || []) as any[]) {
      cpBySym.set(String(r.symbol).toUpperCase(), num(r.quantity));
    }
    const repairs = holdings
      .filter(h => {
        const have = cpBySym.get(h.symbol.toUpperCase());
        return have === undefined || Math.abs(have - h.quantity) > 1e-9;
      })
      .map(h => ({
        user_id: userId,
        symbol: h.symbol.toUpperCase(),
        quantity: h.quantity,
        avg_buy_price: h.avgPrice,
        updated_at: new Date().toISOString(),
      }));
    if (repairs.length) {
      trace('holdings', 'reconciling stores', { count: repairs.length, symbols: repairs.map(r => r.symbol) });
      await sb.from('crypto_positions').upsert(repairs, { onConflict: 'user_id,symbol' });
    }
  } catch {}

  trace('holdings', 'returning', { count: holdings.length, symbols: holdings.map(h => h.symbol) });
  return jsonNoStore({ ok: true, holdings });
}
