/**
 * GET /api/analytics/fmp?userId=...
 * Deep fundamental analysis of the user's holdings via Financial Modeling Prep,
 * plus screened ideas matched to what they already own. Needs FMP_API_KEY.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE = 'https://financialmodelingprep.com/api';
const CACHE: Record<string, { at: number; data: any }> = {};
const TTL = 15 * 60 * 1000;
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

function admin() {
  return supabaseAdmin();
}

async function fmp(path: string, key: string) {
  try {
    const sep = path.includes('?') ? '&' : '?';
    const r = await fetch(BASE + path + sep + 'apikey=' + key, { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) return NextResponse.json({ ok: false, error: 'FMP_API_KEY not set', holdings: [], ideas: [] });

  const userId = new URL(req.url).searchParams.get('userId') || '';
  if (!userId) return NextResponse.json({ ok: true, holdings: [], ideas: [] });

  const hit = CACHE[userId];
  if (hit && Date.now() - hit.at < TTL) return NextResponse.json({ ok: true, cached: true, ...hit.data });

  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });

  const [{ data: pos }, { data: cp }] = await Promise.all([
    sb.from('positions').select('symbol, quantity, avg_entry_price').eq('user_id', userId),
    sb.from('crypto_positions').select('symbol, quantity, avg_buy_price').eq('user_id', userId),
  ]);
  const stockSyms = [...new Set((pos || []).map((r: any) => String(r.symbol).toUpperCase()))].slice(0, 8);
  const cryptoSyms = [...new Set((cp || []).map((r: any) => String(r.symbol).toUpperCase()))].slice(0, 6);

  const analyzed = await Promise.all(stockSyms.map(async (sym) => {
    const [quote, ratios, rating, dcf, profile] = await Promise.all([
      fmp('/v3/quote/' + sym, key),
      fmp('/v3/ratios-ttm/' + sym, key),
      fmp('/v3/rating/' + sym, key),
      fmp('/v3/discounted-cash-flow/' + sym, key),
      fmp('/v3/profile/' + sym, key),
    ]);
    const q = Array.isArray(quote) ? quote[0] : null;
    const r = Array.isArray(ratios) ? ratios[0] : null;
    const rt = Array.isArray(rating) ? rating[0] : null;
    const d = Array.isArray(dcf) ? dcf[0] : null;
    const p = Array.isArray(profile) ? profile[0] : null;
    if (!q) return null;

    const price = num(q.price);
    const fair = num(d?.dcf);
    const held = (pos || []).find((x: any) => String(x.symbol).toUpperCase() === sym);
    const avg = num(held?.avg_entry_price);

    return {
      symbol: sym,
      name: p?.companyName || q.name || sym,
      sector: p?.sector || null,
      industry: p?.industry || null,
      price,
      yourAvg: avg,
      yourPnlPct: avg > 0 ? ((price - avg) / avg) * 100 : null,
      changePct: num(q.changesPercentage),
      marketCap: num(q.marketCap),
      pe: num(q.pe) || num(r?.peRatioTTM) || null,
      pb: num(r?.priceToBookRatioTTM) || null,
      roe: r?.returnOnEquityTTM != null ? num(r.returnOnEquityTTM) * 100 : null,
      debtToEquity: num(r?.debtEquityRatioTTM) || null,
      currentRatio: num(r?.currentRatioTTM) || null,
      grossMargin: r?.grossProfitMarginTTM != null ? num(r.grossProfitMarginTTM) * 100 : null,
      netMargin: r?.netProfitMarginTTM != null ? num(r.netProfitMarginTTM) * 100 : null,
      rating: rt?.rating || null,
      ratingScore: num(rt?.ratingScore) || null,
      ratingRecommendation: rt?.ratingRecommendation || null,
      dcf: fair || null,
      dcfGapPct: fair > 0 && price > 0 ? ((fair - price) / price) * 100 : null,
      yearHigh: num(q.yearHigh) || null,
      yearLow: num(q.yearLow) || null,
      fromHighPct: q.yearHigh ? ((price - num(q.yearHigh)) / num(q.yearHigh)) * 100 : null,
    };
  }));
  const holdings = analyzed.filter(Boolean) as any[];

  const [sectors, screened] = await Promise.all([
    fmp('/v3/sectors-performance', key),
    fmp('/v3/stock-screener?marketCapMoreThan=10000000000&betaLowerThan=2&volumeMoreThan=1000000&isActivelyTrading=true&limit=40', key),
  ]);

  const ownedSectors = [...new Set(holdings.map((h) => h.sector).filter(Boolean))];
  const owned = new Set(stockSyms);
  const ideas = (Array.isArray(screened) ? screened : [])
    .filter((s: any) => !owned.has(String(s.symbol).toUpperCase()))
    .map((s: any) => ({
      symbol: s.symbol,
      name: s.companyName,
      sector: s.sector,
      price: num(s.price),
      marketCap: num(s.marketCap),
      beta: num(s.beta),
      score: (ownedSectors.includes(s.sector) ? 2 : 0) + Math.min(3, num(s.marketCap) / 5e11),
      rationale: ownedSectors.includes(s.sector)
        ? 'Same sector as holdings you already own (' + s.sector + ').'
        : 'Adds ' + (s.sector || 'new sector') + ' exposure your book currently lacks.',
    }))
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 6);

  const data = {
    holdings, crypto: cryptoSyms,
    sectors: Array.isArray(sectors) ? sectors.slice(0, 11) : [],
    ideas, ownedSectors,
  };
  CACHE[userId] = { at: Date.now(), data };
  return NextResponse.json({ ok: true, cached: false, ...data });
}
