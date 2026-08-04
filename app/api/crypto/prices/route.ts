/**
 * GET /api/crypto/prices?symbols=BTC,ETH,SOL
 * Live crypto prices + 24h change. Uses sources that work from datacenter/US IPs
 * : CoinGecko  -> Coinbase spot.
 * Returns { ok, prices: { BTC: { price, change }, ... } } and never throws.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STABLE = new Set(['USDT', 'USDC', 'DAI', 'USD']);
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

const CG_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple',
  ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot', TRX: 'tron', DOGE: 'dogecoin',
  SHIB: 'shiba-inu', PEPE: 'pepe', WIF: 'dogwifcoin', LINK: 'chainlink', UNI: 'uniswap',
  AAVE: 'aave', MKR: 'maker', LDO: 'lido-dao', MATIC: 'matic-network', LTC: 'litecoin',
  ATOM: 'cosmos', NEAR: 'near', CRO: 'crypto-com-chain', OKB: 'okb', IMX: 'immutable-x',
  SAND: 'the-sandbox', AXS: 'axie-infinity', MANA: 'decentraland',
};

async function fromCoinGecko(symbols: string[]) {
  const ids = symbols.map(s => CG_IDS[s]).filter(Boolean);
  if (!ids.length) return {};
  const key = process.env.COINGECKO_API_KEY?.trim();
  const base = key
    ? `https://pro-api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true&x_cg_pro_api_key=${key}`
    : `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`;
  const j = await (await fetch(base, { cache: 'no-store' })).json();
  const out: Record<string, { price: number; change: number }> = {};
  for (const s of symbols) {
    const id = CG_IDS[s];
    const row = id ? j?.[id] : null;
    const price = num(row?.usd);
    if (price > 0) out[s] = { price, change: num(row?.usd_24h_change) };
  }
  return out;
}

async function fromCoinbase(sym: string) {
  // keyless, US-friendly; no 24h change
  const j = await (await fetch(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`, { cache: 'no-store' })).json();
  return num(j?.data?.amount);
}

export async function GET(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get('symbols') || 'BTC,ETH,SOL';
  const symbols = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  const prices: Record<string, { price: number; change: number }> = {};
  for (const s of symbols) if (STABLE.has(s)) prices[s] = { price: 1, change: 0 };
  const need = symbols.filter(s => !STABLE.has(s));

  // 1) CoinGecko 
  try {
    const cg = await fromCoinGecko(need);
    Object.assign(prices, cg);
  } catch {}

  // 2) Coinbase for anything still missing 
  const missing = need.filter(s => !prices[s]);
  if (missing.length) {
    await Promise.all(missing.map(async (s) => {
      try { const p = await fromCoinbase(s); if (p > 0) prices[s] = { price: p, change: 0 }; } catch {}
    }));
  }

  return NextResponse.json({ ok: true, prices, source: Object.keys(prices).length ? 'live' : 'none' });
}
