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
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CG_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', USDC: 'usd-coin',
  BNB: 'binancecoin', SOL: 'solana', TRX: 'tron', XRP: 'ripple',
};
const STABLE = new Set(['USDT', 'USDC', 'DAI', 'USD']);
// fallback USD prices per coin, used when the live feed is unavailable.
// Without this, a failed price lookup made crypto = USD amount (e.g. "2256 BTC").
const SEED_USD: Record<string, number> = {
  BTC: 67234, ETH: 3456, SOL: 145, BNB: 567, XRP: 0.52, ADA: 0.46, AVAX: 35.7,
  DOT: 7.9, TRX: 0.12, DOGE: 0.082, SHIB: 0.0000234, PEPE: 0.0000098, WIF: 2.34,
  LINK: 14.6, UNI: 12.3, AAVE: 98, MKR: 2456, LDO: 1.87, MATIC: 0.57, LTC: 95.7,
  ATOM: 9.45, NEAR: 6.78, CRO: 0.12, OKB: 45.6, IMX: 2.11, SAND: 0.46, AXS: 6.23, MANA: 0.41,
};
// 1 USD = X local — fallback when no live/admin rate is available.
const FIAT_SEED: Record<string, number> = {
  NGN: 1600, PHP: 56, GHS: 15, KES: 129, ZAR: 18.3, GBP: 0.79, EUR: 0.92,
  INR: 83, CAD: 1.36, AUD: 1.52, JPY: 157, CNY: 7.2, BRL: 5.4, MXN: 17,
  EGP: 48, KRW: 1350, IDR: 15800, VND: 25000, TZS: 2600, UGX: 3800, XOF: 605, XAF: 605,
};
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

function admin() {
  return supabaseAdmin();
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
  // open.er-api.com — free, no key
  try {
    const j = await (await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' })).json();
    const r = num(j?.rates?.[cur]);
    if (r > 0) return r;
  } catch {}
  // exchangerate.host fallback
  try {
    const j = await (await fetch(`https://api.exchangerate.host/latest?base=USD&symbols=${cur}`, { cache: 'no-store' })).json();
    const r = num(j?.rates?.[cur]);
    if (r > 0) return r;
  } catch {}
  // seed rate
  return FIAT_SEED[cur] || 0;
}

async function usdPerCrypto(asset: string): Promise<number> {
  const a = asset.toUpperCase();
  if (STABLE.has(a)) return 1;

  // Binance public ticker — free, no key, very reliable (SYMBOL + USDT pair)
  try {
    const j = await (await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${a}USDT`, { cache: 'no-store' })).json();
    const p = num(j?.price);
    if (p > 0) return p;
  } catch {}

  // CoinGecko fallback
  const id = CG_IDS[a];
  if (id) {
    try {
      const key = process.env.COINGECKO_API_KEY;
      const base = key
        ? `https://pro-api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&x_cg_pro_api_key=${key}`
        : `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
      const j = await (await fetch(base, { cache: 'no-store' })).json();
      const live = num(j?.[id]?.usd);
      if (live > 0) return live;
    } catch {}
  }

  // seed price so we never treat 1 coin as $1
  return SEED_USD[a] || 0;
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
