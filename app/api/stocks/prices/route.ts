/**
 * GET /api/stocks/prices?symbols=AAPL,TSLA
 * Live stock prices + daily change. Tries Alpaca (snapshots) then Finnhub, then
 * returns an empty map so callers keep their seed prices. Needs the user's keys:
 *   ALPACA_API_KEY_ID + ALPACA_API_SECRET_KEY   (data feed: iex by default)
 *   FINNHUB_API_KEY
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

async function fromAlpaca(symbols: string[]) {
  const id = process.env.ALPACA_API_KEY_ID, sk = process.env.ALPACA_API_SECRET_KEY;
  if (!id || !sk) return null;
  const feed = process.env.ALPACA_DATA_FEED || 'iex';
  const url = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${symbols.join(',')}&feed=${feed}`;
  const res = await fetch(url, { headers: { 'APCA-API-KEY-ID': id, 'APCA-API-SECRET-KEY': sk }, cache: 'no-store' });
  if (!res.ok) return null;
  const j = await res.json();
  const out: Record<string, { price: number; change: number }> = {};
  for (const sym of symbols) {
    const snap = j?.[sym] || j?.snapshots?.[sym];
    if (!snap) continue;
    const price = num(snap.latestTrade?.p) || num(snap.latestQuote?.ap) || num(snap.dailyBar?.c);
    const prevClose = num(snap.prevDailyBar?.c) || num(snap.dailyBar?.o);
    const change = prevClose > 0 && price > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    if (price > 0) out[sym] = { price, change };
  }
  return Object.keys(out).length ? out : null;
}

async function fromFinnhub(symbols: string[]) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  const out: Record<string, { price: number; change: number }> = {};
  await Promise.all(symbols.map(async (sym) => {
    try {
      const j = await (await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`, { cache: 'no-store' })).json();
      const price = num(j?.c);
      if (price > 0) out[sym] = { price, change: num(j?.dp) };
    } catch {}
  }));
  return Object.keys(out).length ? out : null;
}

export async function GET(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get('symbols') || '';
  const symbols = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 50);
  if (!symbols.length) return NextResponse.json({ ok: true, prices: {} });
  let prices: Record<string, { price: number; change: number }> | null = null;
  try { prices = await fromAlpaca(symbols); } catch {}
  if (!prices) { try { prices = await fromFinnhub(symbols); } catch {} }
  return NextResponse.json({ ok: true, prices: prices || {}, source: prices ? 'live' : 'none' });
}
