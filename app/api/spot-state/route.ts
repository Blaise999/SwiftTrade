/**
 * Spot crypto state, server-side.
 *
 * The client CANNOT read/write user_trading_data directly: RLS is on and the
 * app uses custom auth, so auth.uid() is null — reads return zero rows and the
 * store silently loads nothing. This route uses the service role.
 *
 *   GET  ?userId=...            -> { state }
 *   POST { userId, state }      -> saves
 */
import { NextRequest, NextResponse } from 'next/server';
import { jsonNoStore } from '@/lib/no-store';
import { trace } from '@/lib/trace';
import { createClient } from '@supabase/supabase-js';
import { fetchCryptoPrices } from '@/lib/live-prices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return jsonNoStore({ ok: false, state: null }, { status: 503 });
  const userId = new URL(req.url).searchParams.get('userId') || '';
  if (!userId) return jsonNoStore({ ok: true, state: null });

  const [{ data: utd }, { data: cp }] = await Promise.all([
    sb.from('user_trading_data').select('spot_crypto_state').eq('user_id', userId).maybeSingle(),
    sb.from('crypto_positions').select('symbol, quantity, avg_buy_price').eq('user_id', userId),
  ]);

  const state: any = utd?.spot_crypto_state || {};
  const existing: any[] = Array.isArray(state.positions) ? state.positions : [];

  // crypto_positions is the source of truth — merge anything missing from state
  const bySym = new Map<string, any>();
  for (const p of existing) {
    const s = String(p.symbol || '').toUpperCase();
    if (s) bySym.set(s, p);
  }
  for (const r of (cp || []) as any[]) {
    const s = String(r.symbol).toUpperCase();
    const q = Number(r.quantity) || 0;
    if (!s || q <= 0) continue;
    const prev = bySym.get(s);
    if (!prev || q > (Number(prev.quantity) || 0)) {
      bySym.set(s, {
        ...(prev || {}),
        symbol: s,
        name: prev?.name || s,
        quantity: q,
        avgBuyPrice: Number(r.avg_buy_price) || prev?.avgBuyPrice || 0,
      });
    }
  }

  const merged = [...bySym.values()].filter((p) => (Number(p.quantity) || 0) > 0);

  // The spot store renders p.displayValue / p.displayPnL / p.marketValue.
  // Rows rebuilt from crypto_positions lacked those fields, so positions showed
  // as blank or zero. Hydrate the FULL position shape with live prices here.
  let live: Record<string, { price: number; change: number }> = {};
  try { live = await fetchCryptoPrices(merged.map((p: any) => String(p.symbol).toUpperCase())); } catch {}

  const nowIso = new Date().toISOString();
  const positions = merged.map((p: any, i: number) => {
    const sym = String(p.symbol).toUpperCase();
    const qty = Number(p.quantity) || 0;
    const avg = Number(p.avgBuyPrice ?? p.avgPrice) || 0;
    const cur = live[sym]?.price || Number(p.currentPrice) || avg;
    const marketValue = qty * cur;
    const cost = Number(p.totalCostBasis) || qty * avg;
    const pnl = marketValue - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    const shielded = !!p.shieldEnabled;
    // a shielded position shows its locked value, not the live one
    const shownValue = shielded && Number(p.shieldSnapValue) > 0 ? Number(p.shieldSnapValue) : marketValue;
    const shownPnl = shielded && Number(p.shieldSnapValue) > 0 ? Number(p.shieldSnapValue) - cost : pnl;

    return {
      id: p.id || `pos_${sym}_${i}`,
      userId,
      symbol: sym,
      name: p.name || sym,
      icon: p.icon || null,
      quantity: qty,
      avgBuyPrice: avg,
      totalCostBasis: cost,
      currentPrice: cur,
      marketValue,
      unrealizedPnL: pnl,
      unrealizedPnLPercent: pnlPct,
      shieldEnabled: shielded,
      shieldSnapPrice: p.shieldSnapPrice ?? null,
      shieldSnapValue: p.shieldSnapValue ?? null,
      shieldActivatedAt: p.shieldActivatedAt ?? null,
      displayValue: shownValue,
      displayPnL: shownPnl,
      displayPnLPercent: cost > 0 ? (shownPnl / cost) * 100 : 0,
      createdAt: p.createdAt || nowIso,
      updatedAt: nowIso,
    };
  });

  const portfolioValue = positions.reduce((s2, p) => s2 + p.displayValue, 0);
  const account = state.account
    ? { ...state.account, portfolioValue, displayPortfolioValue: portfolioValue, updatedAt: nowIso }
    : state.account;

  trace('spot-state', 'merged', {
    userId, cryptoRows: (cp || []).length, stateRows: existing.length,
    out: positions.length, priced: Object.keys(live).length,
  });

  return jsonNoStore({ ok: true, state: { ...state, account, positions } });
}

export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return jsonNoStore({ ok: false }, { status: 503 });
  const { userId, state } = await req.json().catch(() => ({} as any));
  if (!userId || !state) return jsonNoStore({ ok: false, error: 'userId and state required' }, { status: 400 });

  const { error } = await sb.from('user_trading_data').upsert(
    { user_id: userId, spot_crypto_state: state, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' });
  if (error) return jsonNoStore({ ok: false, error: error.message }, { status: 500 });
  return jsonNoStore({ ok: true });
}
