// app/api/market/stocks/quotes/route.ts
//
// Live stock/ETF quotes with NO API KEY REQUIRED.
//   Primary  : Yahoo Finance batch quote  (1 request for all symbols)
//   Fallback : Yahoo Finance per-symbol chart endpoint (no crumb needed)
//   Optional : Alpaca (only if ALPACA_API_KEY_ID / SECRET are set)
//
// A short in-memory cache keeps the UI feeling live while protecting the
// upstream from spam, and stale data is served if a refresh fails — so the
// page never shows an empty/slow state.
import { NextResponse } from 'next/server';
import { jsonNoStore } from '@/lib/no-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Quote = {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  prevClose?: number;
  changePercent24h?: number;
  ts: number;
};

type CacheEntry = { ts: number; data: Quote };
const g = globalThis as any;
g.__STOCK_QUOTES_CACHE ||= new Map<string, CacheEntry>();
const CACHE: Map<string, CacheEntry> = g.__STOCK_QUOTES_CACHE;

const TTL_MS = 8_000;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

function clampSymbols(raw: string) {
  return Array.from(
    new Set(
      raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean),
    ),
  ).slice(0, 25);
}

function num(...vals: any[]) {
  for (const v of vals) {
    const x = Number(v);
    if (Number.isFinite(x)) return x;
  }
  return 0;
}

async function fetchJson(url: string, timeoutMs = 7000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': UA },
      signal: ac.signal,
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/* ---- Yahoo batch quote (1 request) ---- */
async function yahooBatch(symbols: string[]): Promise<Record<string, Quote>> {
  const url =
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols.join(','))}`;
  const json = await fetchJson(url);
  const rows: any[] = json?.quoteResponse?.result || [];
  const out: Record<string, Quote> = {};
  const now = Date.now();
  for (const r of rows) {
    const sym = String(r?.symbol || '').toUpperCase();
    const price = num(r?.regularMarketPrice, r?.postMarketPrice, r?.preMarketPrice);
    if (!sym || price <= 0) continue;
    const prevClose = num(r?.regularMarketPreviousClose, r?.chartPreviousClose);
    const pct = Number.isFinite(Number(r?.regularMarketChangePercent))
      ? Number(r.regularMarketChangePercent)
      : prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    out[sym] = {
      symbol: sym,
      price,
      bid: num(r?.bid, price * 0.9999),
      ask: num(r?.ask, price * 1.0001),
      prevClose: prevClose || undefined,
      changePercent24h: pct,
      ts: now,
    };
  }
  return out;
}

/* ---- Yahoo per-symbol chart fallback (works without crumb) ---- */
async function yahooChartOne(symbol: string): Promise<Quote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const json = await fetchJson(url);
    const meta = json?.chart?.result?.[0]?.meta;
    const price = num(meta?.regularMarketPrice);
    if (!meta || price <= 0) return null;
    const prevClose = num(meta?.chartPreviousClose, meta?.previousClose);
    const pct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
    return {
      symbol,
      price,
      bid: price * 0.9999,
      ask: price * 1.0001,
      prevClose: prevClose || undefined,
      changePercent24h: pct,
      ts: Date.now(),
    };
  } catch {
    return null;
  }
}

/* ---- Optional Alpaca (only when keys exist) ---- */
async function alpacaSnapshots(symbols: string[]): Promise<Record<string, Quote>> {
  const key = process.env.ALPACA_API_KEY_ID;
  const secret = process.env.ALPACA_API_SECRET_KEY;
  if (!key || !secret) return {};
  const feed = (process.env.ALPACA_DATA_FEED || 'iex').trim();
  const qs = new URLSearchParams({ symbols: symbols.join(','), feed });
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 7000);
  try {
    const res = await fetch(`https://data.alpaca.markets/v2/stocks/snapshots?${qs}`, {
      headers: { accept: 'application/json', 'APCA-API-KEY-ID': key, 'APCA-API-SECRET-KEY': secret },
      signal: ac.signal,
      cache: 'no-store',
    });
    if (!res.ok) return {};
    const json = await res.json();
    const out: Record<string, Quote> = {};
    const now = Date.now();
    for (const sym of symbols) {
      const s = json?.[sym] ?? json?.snapshots?.[sym];
      if (!s) continue;
      const price = num(s?.latestTrade?.p, s?.minuteBar?.c, s?.dailyBar?.c);
      const prevClose = num(s?.prevDailyBar?.c);
      if (price <= 0) continue;
      out[sym] = {
        symbol: sym,
        price,
        bid: num(s?.latestQuote?.bp, price * 0.9999),
        ask: num(s?.latestQuote?.ap, price * 1.0001),
        prevClose: prevClose || undefined,
        changePercent24h: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
        ts: now,
      };
    }
    return out;
  } catch {
    return {};
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const symbols = clampSymbols(url.searchParams.get('symbols') || '');
  if (!symbols.length) return jsonNoStore({}, { status: 200 });

  const now = Date.now();
  const out: Record<string, Quote> = {};
  const missing: string[] = [];

  // 1) serve fresh cache where possible
  for (const sym of symbols) {
    const c = CACHE.get(sym);
    if (c && now - c.ts < TTL_MS) out[sym] = c.data;
    else missing.push(sym);
  }

  if (missing.length) {
    let fetched: Record<string, Quote> = {};
    const hasAlpaca = !!(process.env.ALPACA_API_KEY_ID && process.env.ALPACA_API_SECRET_KEY);

    // 1) Alpaca first when configured — reliable from datacenter IPs (Yahoo isn't).
    if (hasAlpaca) {
      try { fetched = await alpacaSnapshots(missing); } catch { fetched = {}; }
    }

    // 2) Yahoo batch for anything still missing
    let stillMissing = missing.filter((s) => !fetched[s]);
    if (stillMissing.length) {
      try {
        const y = await yahooBatch(stillMissing);
        Object.assign(fetched, y);
      } catch {}
    }

    // 3) Yahoo per-symbol chart for the rest
    stillMissing = missing.filter((s) => !fetched[s]);
    if (stillMissing.length) {
      const results = await Promise.all(stillMissing.map((s) => yahooChartOne(s)));
      results.forEach((q) => { if (q) fetched[q.symbol] = q; });
    }

    // 4) Alpaca last-resort if we didn't run it first
    const leftovers = missing.filter((s) => !fetched[s]);
    if (leftovers.length && !hasAlpaca) {
      try {
        const a = await alpacaSnapshots(leftovers);
        Object.assign(fetched, a);
      } catch {}
    }

    // commit
    for (const sym of missing) {
      const q = fetched[sym];
      if (q) {
        CACHE.set(sym, { ts: now, data: q });
        out[sym] = q;
      } else {
        // fall back to stale cache if we have it
        const c = CACHE.get(sym);
        if (c) out[sym] = c.data;
      }
    }
  }

  return jsonNoStore(out, { status: 200 });
}
