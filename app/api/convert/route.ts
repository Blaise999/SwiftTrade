/**
 * GET /api/convert?amount=50000&from=NGN&to=BTC
 * Converts local currency -> USD -> crypto so SwiftBridge (and the notifications
 * built from it) can state real "sent X / received Y" amounts.
 *
 * Rates:
 *   fiat -> USD : bridge_countries.usd_rate if set, else exchangerate.host (free).
 *   USD  -> crypto : CoinGecko simple price (stablecoins pinned to $1).
 * All lookups are best-effort with safe fallbacks; never throws.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CG_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', USDC: 'usd-coin',
  BNB: 'binancecoin', SOL: 'solana', TRX: 'tron', XRP: 'ripple',
};
const STABLE = new Set(['USDT', 'USDC', 'DAI', 'USD']);
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function fiatPerUsd(currency: string): Promise<number> {
  const cur = currency.toUpperCase();
  if (cur === 'USD') return 1;
  // admin-set rate on bridge_countries (1 USD = usd_rate local)
  const sb = admin();
  if (sb) {
    const { data } = await sb.from('bridge_countries').select('usd_rate').eq('currency', cur).maybeSingle();
    if (data && num((data as any).usd_rate) > 0) return num((data as any).usd_rate);
  }
  // live fallback
  try {
    const j = await (await fetch(`https://api.exchangerate.host/latest?base=USD&symbols=${cur}`, { cache: 'no-store' })).json();
    const r = num(j?.rates?.[cur]);
    if (r > 0) return r;
  } catch {}
  return 0;
}

async function usdPerCrypto(asset: string): Promise<number> {
  const a = asset.toUpperCase();
  if (STABLE.has(a)) return 1;
  const id = CG_IDS[a];
  if (!id) return 0;
  try {
    const key = process.env.COINGECKO_API_KEY;
    const base = key
      ? `https://pro-api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&x_cg_pro_api_key=${key}`
      : `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
    const j = await (await fetch(base, { cache: 'no-store' })).json();
    return num(j?.[id]?.usd);
  } catch { return 0; }
}

export async function GET(req: NextRequest) {
  const p = new URL(req.url).searchParams;
  const amount = num(p.get('amount'));
  const from = (p.get('from') || 'USD').toUpperCase();
  const to = (p.get('to') || 'USDT').toUpperCase();

  const rate = await fiatPerUsd(from);              // 1 USD = rate `from`
  const usd = rate > 0 ? amount / rate : (from === 'USD' ? amount : 0);
  const price = await usdPerCrypto(to);             // 1 `to` = price USD
  const crypto = price > 0 ? usd / price : 0;

  return NextResponse.json({
    ok: rate > 0 && price > 0,
    from, to, amount,
    usd: Number(usd.toFixed(2)),
    crypto: Number(crypto.toFixed(8)),
    fx_rate: rate,           // local per USD
    crypto_price: price,     // USD per crypto unit
  });
}
