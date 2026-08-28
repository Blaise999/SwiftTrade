/**
 * GET /api/news?market=stocks|crypto|fx|all
 * Server-cached market news. Uses Finnhub when FINNHUB_API_KEY is set,
 * falls back to CoinGecko status updates for crypto. Cached 10 min in-process
 * so the landing page stays fast and we don't burn rate limits.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Item = {
  id: string; market: 'stocks' | 'crypto' | 'fx';
  headline: string; summary: string; source: string;
  url: string; image: string | null; datetime: number;
};

const CACHE: Record<string, { at: number; items: Item[] }> = {};
const TTL = 10 * 60 * 1000;

function dedupe(items: Item[]) {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = i.headline.toLowerCase().slice(0, 60);
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
}

async function finnhub(category: string, market: Item['market']): Promise<Item[]> {
  const key = process.env.FINNHUB_API_KEY?.trim();
  if (!key) return [];
  const r = await fetch(`https://finnhub.io/api/v1/news?category=${category}&token=${key}`, { cache: 'no-store' });
  if (!r.ok) return [];
  const j = await r.json();
  if (!Array.isArray(j)) return [];
  return j.slice(0, 24).map((n: any) => ({
    id: `fh-${n.id || n.datetime}-${market}`,
    market,
    headline: String(n.headline || '').trim(),
    summary: String(n.summary || '').trim(),
    source: String(n.source || 'Finnhub'),
    url: String(n.url || ''),
    image: n.image ? String(n.image) : null,
    datetime: Number(n.datetime || 0) * 1000,
  })).filter((n: Item) => n.headline && n.url);
}

async function cryptoFallback(): Promise<Item[]> {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/news', { cache: 'no-store' });
    if (!r.ok) return [];
    const j = await r.json();
    const arr = Array.isArray(j?.data) ? j.data : [];
    return arr.slice(0, 12).map((n: any, i: number) => ({
      id: `cg-${i}`, market: 'crypto' as const,
      headline: String(n.title || '').trim(),
      summary: String(n.description || '').trim(),
      source: String(n.news_site || 'CoinGecko'),
      url: String(n.url || ''),
      image: n.thumb_2x || null,
      datetime: n.updated_at ? Number(n.updated_at) * 1000 : Date.now(),
    })).filter((n: Item) => n.headline && n.url);
  } catch { return []; }
}

async function build(market: string): Promise<Item[]> {
  if (market === 'crypto') {
    const a = await finnhub('crypto', 'crypto');
    return dedupe(a.length ? a : await cryptoFallback());
  }
  if (market === 'fx') return dedupe(await finnhub('forex', 'fx'));
  if (market === 'stocks') return dedupe(await finnhub('general', 'stocks'));
  // all
  const [s, c, f] = await Promise.all([
    finnhub('general', 'stocks'),
    finnhub('crypto', 'crypto').then(async (x) => x.length ? x : await cryptoFallback()),
    finnhub('forex', 'fx'),
  ]);
  const mixed: Item[] = [];
  const max = Math.max(s.length, c.length, f.length);
  for (let i = 0; i < max; i++) {   // interleave so no single market dominates
    if (s[i]) mixed.push(s[i]);
    if (c[i]) mixed.push(c[i]);
    if (f[i]) mixed.push(f[i]);
  }
  return dedupe(mixed);
}

export async function GET(req: NextRequest) {
  const market = (new URL(req.url).searchParams.get('market') || 'all').toLowerCase();
  const hit = CACHE[market];
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json({ ok: true, cached: true, items: hit.items });
  }
  let items: Item[] = [];
  try { items = await build(market); } catch { items = []; }
  if (items.length) CACHE[market] = { at: Date.now(), items };
  return NextResponse.json({ ok: true, cached: false, items: items.length ? items : (hit?.items || []) });
}
