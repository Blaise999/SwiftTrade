/**
 * GET /api/crypto/prices?symbols=BTC,ETH,SOL
 * Live crypto prices + 24h change from Binance's public 24hr ticker (no key).
 * Falls back gracefully to an empty map so callers can keep their seed prices.
 * Returns { ok, prices: { BTC: { price, change } , ... } }
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STABLE = new Set(['USDT', 'USDC', 'DAI', 'USD']);
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export async function GET(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get('symbols') || 'BTC,ETH,SOL';
  const symbols = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);

  const prices: Record<string, { price: number; change: number }> = {};
  // stablecoins are ~$1
  for (const s of symbols) if (STABLE.has(s)) prices[s] = { price: 1, change: 0 };

  const need = symbols.filter(s => !STABLE.has(s));
  if (need.length) {
    try {
      const pairs = JSON.stringify(need.map(s => `${s}USDT`));
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(pairs)}`, { cache: 'no-store' });
      const arr = await res.json();
      if (Array.isArray(arr)) {
        for (const t of arr) {
          const sym = String(t.symbol || '').replace(/USDT$/, '');
          const price = num(t.lastPrice);
          if (sym && price > 0) prices[sym] = { price, change: num(t.priceChangePercent) };
        }
      }
    } catch { /* keep whatever we have; caller falls back to seed */ }
  }

  return NextResponse.json({ ok: true, prices });
}
