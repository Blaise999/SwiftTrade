/**
 * GET /api/debug/feeds  — tests the 3 live feeds with your env vars and reports
 * exactly what each returns (status + sample + error). Visit this URL after
 * deploying to see which feed works and which is misconfigured.
 * Does NOT expose secret values — only whether they're present.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const has = (v?: string) => (v && v.trim() ? 'set' : 'MISSING');

export async function GET() {
  const out: any = { env: {}, crypto: {}, stocks: {}, fx: {} };

  out.env = {
    COINGECKO_API_KEY: has(process.env.COINGECKO_API_KEY),
    COINGECKO_API_URL: process.env.COINGECKO_API_URL || '(default public)',
    ALPACA_API_KEY_ID: has(process.env.ALPACA_API_KEY_ID),
    ALPACA_API_SECRET_KEY: has(process.env.ALPACA_API_SECRET_KEY),
    ALPACA_DATA_FEED: process.env.ALPACA_DATA_FEED || 'iex (default)',
    OANDA_API_TOKEN: has(process.env.OANDA_API_TOKEN),
    OANDA_ENV: process.env.OANDA_ENV || '(unset)',
    OANDA_REST_URL: process.env.OANDA_REST_URL || '(derived from OANDA_ENV)',
  };

  // ── CRYPTO (CoinGecko) ──
  try {
    const key = process.env.COINGECKO_API_KEY?.trim();
    let base = (process.env.COINGECKO_API_URL?.trim() || 'https://api.coingecko.com/api/v3').replace(/\/+$/, '');
    if (!/\/api\/v3$/.test(base)) base += '/api/v3';
    const isPro = base.includes('pro-api');
    const p = new URLSearchParams({ ids: 'bitcoin', vs_currencies: 'usd', include_24hr_change: 'true' });
    if (key) p.set(isPro ? 'x_cg_pro_api_key' : 'x_cg_demo_api_key', key);
    const url = `${base}/simple/price?${p}`;
    const r = await fetch(url, { cache: 'no-store' });
    const body = await r.text();
    out.crypto = { keyMode: key ? (isPro ? 'pro' : 'demo') : 'keyless', status: r.status, ok: r.ok, sample: body.slice(0, 200) };
  } catch (e: any) { out.crypto = { error: String(e?.message || e) }; }

  // ── STOCKS (Alpaca) ──
  try {
    const id = process.env.ALPACA_API_KEY_ID, sk = process.env.ALPACA_API_SECRET_KEY;
    if (!id || !sk) { out.stocks = { skipped: 'keys missing' }; }
    else {
      const feed = (process.env.ALPACA_DATA_FEED || 'iex').trim();
      const r = await fetch(`https://data.alpaca.markets/v2/stocks/snapshots?symbols=AAPL&feed=${feed}`, {
        headers: { accept: 'application/json', 'APCA-API-KEY-ID': id, 'APCA-API-SECRET-KEY': sk }, cache: 'no-store',
      });
      const body = await r.text();
      out.stocks = { feed, status: r.status, ok: r.ok, sample: body.slice(0, 200) };
    }
  } catch (e: any) { out.stocks = { error: String(e?.message || e) }; }

  // ── FX (OANDA) ──
  try {
    const token = process.env.OANDA_API_TOKEN;
    if (!token) { out.fx = { skipped: 'OANDA_API_TOKEN missing' }; }
    else {
      const rest = process.env.OANDA_REST_URL ||
        (String(process.env.OANDA_ENV || '').toLowerCase() === 'live'
          ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com');
      const r = await fetch(`${rest}/v3/instruments/EUR_USD/candles?count=2&granularity=M5&price=M`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      });
      const body = await r.text();
      out.fx = { rest, status: r.status, ok: r.ok, sample: body.slice(0, 200) };
    }
  } catch (e: any) { out.fx = { error: String(e?.message || e) }; }

  return NextResponse.json(out);
}
