/**
 * GET /api/ledger/net-worth   (header: x-user-id)  — CORRECTED.
 * Reads crypto_positions with select('*') and tolerates BOTH column schemas
 * (avg_buy_price OR average_price), and won't crash if the equities `positions`
 * table doesn't exist. Prices crypto via /api/market/prices and equities via
 * /api/market/stocks/quotes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';
import { computeNetWorth, type Position } from '@/lib/ledger/valuation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  return supabaseAdmin();
}

const n = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

async function fetchCrypto(origin: string, syms: string[]) {
  if (!syms.length) return {} as Record<string, number>;
  try {
    const r = await fetch(`${origin}/api/market/prices?symbols=${encodeURIComponent(syms.join(','))}`, { cache: 'no-store' });
    if (!r.ok) return {};
    const data = await r.json(); const src = data?.prices ?? data; const out: Record<string, number> = {};
    if (Array.isArray(src)) for (const row of src) { if (row?.symbol) out[String(row.symbol).toUpperCase()] = n(row.price); }
    else if (src && typeof src === 'object') for (const [k, v] of Object.entries(src)) {
      const p = typeof v === 'number' ? v : n((v as any)?.price ?? (v as any)?.usd); if (p) out[k.toUpperCase()] = p;
    }
    return out;
  } catch { return {}; }
}
async function fetchEquity(origin: string, syms: string[]) {
  if (!syms.length) return {} as Record<string, number>;
  try {
    const r = await fetch(`${origin}/api/market/stocks/quotes?symbols=${encodeURIComponent(syms.join(','))}`, { cache: 'no-store' });
    if (!r.ok) return {};
    const data = await r.json(); const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(data || {})) { const p = n((v as any)?.price); if (p > 0) out[k.toUpperCase()] = p; }
    return out;
  } catch { return {}; }
}

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ ok: false, error: 'x-user-id required' }, { status: 400 });

  const { data: u, error: uErr } = await sb.from('users').select('balance_available, balance_bonus').eq('id', userId).single();
  if (uErr || !u) return NextResponse.json({ ok: false, error: 'user not found' }, { status: 404 });

  const positions: Position[] = [];

  // crypto — from user_trading_data.spot_crypto_state (where the app stores it)
  const { data: utd } = await sb.from('user_trading_data').select('spot_crypto_state').eq('user_id', userId).maybeSingle();
  for (const r of ((utd?.spot_crypto_state as any)?.positions) || []) {
    const qty = n(r.quantity); if (qty <= 0) continue;
    positions.push({ symbol: String(r.symbol).toUpperCase(), assetClass: 'crypto', qty, avgPrice: n(r.avgBuyPrice ?? r.average_price) });
  }

  // equities — ignore error if the table doesn't exist
  const { data: eqRows } = await sb.from('positions').select('symbol, quantity, avg_entry_price, asset_type').eq('user_id', userId);
  for (const r of eqRows || []) {
    const qty = n(r.quantity); if (qty <= 0) continue;
    positions.push({ symbol: String(r.symbol).toUpperCase(), assetClass: r.asset_type === 'stock' ? 'stock' : 'etf', qty, avgPrice: n(r.avg_entry_price) });
  }

  const origin = new URL(req.url).origin;
  const cryptoSyms = Array.from(new Set(positions.filter(p => p.assetClass === 'crypto').map(p => p.symbol)));
  const eqSyms = Array.from(new Set(positions.filter(p => p.assetClass !== 'crypto').map(p => p.symbol)));
  const [cp, ep] = await Promise.all([fetchCrypto(origin, cryptoSyms), fetchEquity(origin, eqSyms)]);

  const nw = computeNetWorth(n(u.balance_available), n(u.balance_bonus), positions, { ...cp, ...ep });
  return NextResponse.json({ ok: true, ...nw });
}
