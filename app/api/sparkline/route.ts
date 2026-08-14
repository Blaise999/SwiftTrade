/**
 * GET /api/sparkline?symbol=BTC&kind=crypto&range=1D
 * Real historical price series for the little glide chart.
 *   crypto -> CoinGecko market_chart   stock -> Alpaca bars
 * Returns { points: number[] } (oldest -> newest). Empty on failure.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

const CG_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple',
  ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot', TRX: 'tron', DOGE: 'dogecoin',
  LINK: 'chainlink', LTC: 'litecoin', MATIC: 'matic-network', SHIB: 'shiba-inu', PEPE: 'pepe',
  TON: 'the-open-network', APT: 'aptos', SUI: 'sui', ARB: 'arbitrum', OP: 'optimism',
};
const RANGE: Record<string, { days: string; tf: string }> = {
  '1D': { days: '1', tf: '5Min' }, '1W': { days: '7', tf: '1Hour' },
  '1M': { days: '30', tf: '1Day' }, '1Y': { days: '365', tf: '1Day' },
};

async function crypto(sym: string, days: string) {
  const id = CG_IDS[sym] || sym.toLowerCase();
  const key = process.env.COINGECKO_API_KEY?.trim();
  let base = (process.env.COINGECKO_API_URL?.trim() || 'https://api.coingecko.com/api/v3').replace(/\/+$/, '');
  if (!/\/api\/v3$/.test(base)) base += '/api/v3';
  const p = new URLSearchParams({ vs_currency: 'usd', days });
  if (key) p.set(base.includes('pro-api') ? 'x_cg_pro_api_key' : 'x_cg_demo_api_key', key);
  const j = await (await fetch(`${base}/coins/${id}/market_chart?${p}`, { cache: 'no-store' })).json();
  return Array.isArray(j?.prices) ? j.prices.map((r: any) => num(r[1])).filter((n: number) => n > 0) : [];
}

async function stock(sym: string, tf: string, days: string) {
  const id = process.env.ALPACA_API_KEY_ID, sk = process.env.ALPACA_API_SECRET_KEY;
  if (!id || !sk) return [];
  const feed = (process.env.ALPACA_DATA_FEED || 'iex').trim();
  const start = new Date(Date.now() - Number(days) * 864e5).toISOString();
  const url = `https://data.alpaca.markets/v2/stocks/${sym}/bars?timeframe=${tf}&start=${start}&limit=200&feed=${feed}`;
  const res = await fetch(url, { headers: { 'APCA-API-KEY-ID': id, 'APCA-API-SECRET-KEY': sk }, cache: 'no-store' });
  if (!res.ok) return [];
  const j = await res.json();
  return Array.isArray(j?.bars) ? j.bars.map((b: any) => num(b.c)).filter((n: number) => n > 0) : [];
}

export async function GET(req: NextRequest) {
  const u = new URL(req.url).searchParams;
  const sym = String(u.get('symbol') || '').toUpperCase();
  const kind = u.get('kind') || 'crypto';
  const r = RANGE[u.get('range') || '1D'] || RANGE['1D'];
  if (!sym) return NextResponse.json({ points: [] });
  let points: number[] = [];
  try { points = kind === 'stock' ? await stock(sym, r.tf, r.days) : await crypto(sym, r.days); } catch {}
  return NextResponse.json({ points });
}
