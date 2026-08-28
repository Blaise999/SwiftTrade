/**
 * GET /api/movers — live top gainers/losers across crypto + stocks for the
 * landing page. Cached 60s. Uses the same feeds as the app (CoinGecko/Alpaca).
 */
import { NextResponse } from 'next/server';
import { fetchCryptoPrices, fetchStockPrices } from '@/lib/live-prices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRYPTO = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT', 'MATIC'];
const STOCKS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD', 'COIN', 'PLTR'];

let CACHE: { at: number; data: any } | null = null;
const TTL = 60_000;

export async function GET() {
  if (CACHE && Date.now() - CACHE.at < TTL) {
    return NextResponse.json({ ok: true, cached: true, ...CACHE.data });
  }
  let crypto: any[] = [], stocks: any[] = [];
  try {
    const [c, s] = await Promise.all([fetchCryptoPrices(CRYPTO), fetchStockPrices(STOCKS)]);
    crypto = Object.entries(c).map(([symbol, v]: any) => ({ symbol, kind: 'crypto', price: v.price, change: v.change }));
    stocks = Object.entries(s).map(([symbol, v]: any) => ({ symbol, kind: 'stock', price: v.price, change: v.change }));
  } catch {}
  const all = [...crypto, ...stocks].filter((x) => x.price > 0);
  const gainers = [...all].sort((a, b) => b.change - a.change).slice(0, 6);
  const losers = [...all].sort((a, b) => a.change - b.change).slice(0, 6);
  const data = { all, gainers, losers };
  if (all.length) CACHE = { at: Date.now(), data };
  return NextResponse.json({ ok: true, cached: false, ...data });
}
