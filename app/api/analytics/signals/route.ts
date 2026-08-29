/**
 * GET /api/analytics/signals?userId=...
 * Per-position technical readings built from real price history.
 * Descriptive, not predictive — see lib/signals.ts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { positionSignals } from '@/lib/signals';
import { fetchCryptoPrices, fetchStockPrices } from '@/lib/live-prices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const CG: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple',
  ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot', DOGE: 'dogecoin', LINK: 'chainlink',
  MATIC: 'matic-network', LTC: 'litecoin', TRX: 'tron', UNI: 'uniswap', PEPE: 'pepe',
  SHIB: 'shiba-inu', BONK: 'bonk', TON: 'the-open-network', APT: 'aptos', SUI: 'sui', OKB: 'okb',
};

async function cryptoHist(sym: string): Promise<number[]> {
  const id = CG[sym] || sym.toLowerCase();
  const key = process.env.COINGECKO_API_KEY?.trim();
  let base = (process.env.COINGECKO_API_URL?.trim() || 'https://api.coingecko.com/api/v3').replace(/\/+$/, '');
  if (!/\/api\/v3$/.test(base)) base += '/api/v3';
  const p = new URLSearchParams({ vs_currency: 'usd', days: '90', interval: 'daily' });
  if (key) p.set(base.includes('pro-api') ? 'x_cg_pro_api_key' : 'x_cg_demo_api_key', key);
  try {
    const j = await (await fetch(`${base}/coins/${id}/market_chart?${p}`, { cache: 'no-store' })).json();
    return Array.isArray(j?.prices) ? j.prices.map((r: any) => num(r[1])).filter((n: number) => n > 0) : [];
  } catch { return []; }
}

async function stockHist(sym: string): Promise<number[]> {
  const id = process.env.ALPACA_API_KEY_ID, sk = process.env.ALPACA_API_SECRET_KEY;
  if (!id || !sk) return [];
  const feed = (process.env.ALPACA_DATA_FEED || 'iex').trim();
  const start = new Date(Date.now() - 130 * 864e5).toISOString();
  try {
    const r = await fetch(
      `https://data.alpaca.markets/v2/stocks/${sym}/bars?timeframe=1Day&start=${start}&limit=100&feed=${feed}`,
      { headers: { 'APCA-API-KEY-ID': id, 'APCA-API-SECRET-KEY': sk }, cache: 'no-store' });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j?.bars) ? j.bars.map((b: any) => num(b.c)).filter((n: number) => n > 0) : [];
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, positions: [] }, { status: 503 });
  const userId = new URL(req.url).searchParams.get('userId') || '';
  if (!userId) return NextResponse.json({ ok: true, positions: [] });

  const [{ data: cp }, { data: pos }] = await Promise.all([
    sb.from('crypto_positions').select('symbol, quantity, avg_buy_price').eq('user_id', userId),
    sb.from('positions').select('symbol, quantity, avg_entry_price').eq('user_id', userId),
  ]);

  const cryptoSyms = (cp || []).map((r: any) => String(r.symbol).toUpperCase());
  const stockSyms = (pos || []).map((r: any) => String(r.symbol).toUpperCase());

  const [cPrices, sPrices] = await Promise.all([
    cryptoSyms.length ? fetchCryptoPrices(cryptoSyms) : Promise.resolve({}),
    stockSyms.length ? fetchStockPrices(stockSyms) : Promise.resolve({}),
  ]);

  const rows = [
    ...(cp || []).map((r: any) => ({
      symbol: String(r.symbol).toUpperCase(), kind: 'crypto' as const,
      quantity: num(r.quantity), avgCost: num(r.avg_buy_price),
      price: (cPrices as any)[String(r.symbol).toUpperCase()]?.price || 0,
    })),
    ...(pos || []).map((r: any) => ({
      symbol: String(r.symbol).toUpperCase(), kind: 'stock' as const,
      quantity: num(r.quantity), avgCost: num(r.avg_entry_price),
      price: (sPrices as any)[String(r.symbol).toUpperCase()]?.price || 0,
    })),
  ].map((r) => ({ ...r, value: r.quantity * r.price })).filter((r) => r.value > 0);

  const total = rows.reduce((s, r) => s + r.value, 0);
  const top = rows.sort((a, b) => b.value - a.value).slice(0, 8);

  const positions = await Promise.all(top.map(async (r) => {
    const prices = r.kind === 'crypto' ? await cryptoHist(r.symbol) : await stockHist(r.symbol);
    if (prices.length < 20) {
      return { symbol: r.symbol, kind: r.kind, price: r.price, weight: total ? (r.value / total) * 100 : 0, signals: [], summary: 'Not enough price history to read this one yet.', horizon: '' };
    }
    const s = positionSignals({
      symbol: r.symbol, prices, price: r.price || prices[prices.length - 1],
      avgCost: r.avgCost, weight: total ? (r.value / total) * 100 : 0,
    });
    return {
      symbol: r.symbol, kind: r.kind, price: r.price,
      weight: total ? (r.value / total) * 100 : 0,
      ...s,
    };
  }));

  return NextResponse.json({ ok: true, positions });
}
