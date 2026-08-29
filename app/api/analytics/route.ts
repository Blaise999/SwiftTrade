/**
 * GET /api/analytics?userId=...
 *
 * Cross-market portfolio analysis — the thing a single-market broker can't do.
 * Pulls the user's stocks + crypto, fetches real price history for each, and
 * computes concentration, correlation, and sector/market exposure.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { jsonNoStore } from '@/lib/no-store';
import { createClient } from '@supabase/supabase-js';
import { fetchCryptoPrices, fetchStockPrices } from '@/lib/live-prices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  return supabaseAdmin();
}
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/** Pearson correlation of two equal-length return series. */
function corr(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 5) return 0;
  const x = a.slice(-n), y = b.slice(-n);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  const d = Math.sqrt(sxx * syy);
  return d === 0 ? 0 : Math.max(-1, Math.min(1, sxy / d));
}

/** Price series -> daily returns. */
function returns(p: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < p.length; i++) if (p[i - 1] > 0) out.push((p[i] - p[i - 1]) / p[i - 1]);
  return out;
}

const CG: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple',
  ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot', DOGE: 'dogecoin', LINK: 'chainlink',
  MATIC: 'matic-network', LTC: 'litecoin', TRX: 'tron', UNI: 'uniswap', PEPE: 'pepe',
  SHIB: 'shiba-inu', BONK: 'bonk', TON: 'the-open-network', APT: 'aptos', SUI: 'sui',
};

async function cryptoHistory(sym: string): Promise<number[]> {
  const id = CG[sym] || sym.toLowerCase();
  const key = process.env.COINGECKO_API_KEY?.trim();
  let base = (process.env.COINGECKO_API_URL?.trim() || 'https://api.coingecko.com/api/v3').replace(/\/+$/, '');
  if (!/\/api\/v3$/.test(base)) base += '/api/v3';
  const p = new URLSearchParams({ vs_currency: 'usd', days: '30', interval: 'daily' });
  if (key) p.set(base.includes('pro-api') ? 'x_cg_pro_api_key' : 'x_cg_demo_api_key', key);
  try {
    const j = await (await fetch(`${base}/coins/${id}/market_chart?${p}`, { cache: 'no-store' })).json();
    return Array.isArray(j?.prices) ? j.prices.map((r: any) => num(r[1])).filter((n: number) => n > 0) : [];
  } catch { return []; }
}

async function stockHistory(sym: string): Promise<number[]> {
  const id = process.env.ALPACA_API_KEY_ID, sk = process.env.ALPACA_API_SECRET_KEY;
  if (!id || !sk) return [];
  const feed = (process.env.ALPACA_DATA_FEED || 'iex').trim();
  const start = new Date(Date.now() - 45 * 864e5).toISOString();
  try {
    const r = await fetch(
      `https://data.alpaca.markets/v2/stocks/${sym}/bars?timeframe=1Day&start=${start}&limit=40&feed=${feed}`,
      { headers: { 'APCA-API-KEY-ID': id, 'APCA-API-SECRET-KEY': sk }, cache: 'no-store' });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j?.bars) ? j.bars.map((b: any) => num(b.c)).filter((n: number) => n > 0) : [];
  } catch { return []; }
}

/** Annualised volatility from daily returns. */
function annualVol(r: number[]): number {
  if (r.length < 5) return 0;
  const m = r.reduce((a, b) => a + b, 0) / r.length;
  const v = r.reduce((a, b) => a + (b - m) ** 2, 0) / (r.length - 1);
  return Math.sqrt(v) * Math.sqrt(365) * 100;
}

/** Sharpe-style return/risk ratio (rf assumed 0 for simplicity). */
function sharpe(r: number[]): number {
  if (r.length < 5) return 0;
  const m = r.reduce((a, b) => a + b, 0) / r.length;
  const sd = Math.sqrt(r.reduce((a, b) => a + (b - m) ** 2, 0) / (r.length - 1));
  return sd === 0 ? 0 : (m / sd) * Math.sqrt(365);
}

/** Worst peak-to-trough decline over the window, as a positive %. */
function maxDrawdown(p: number[]): number {
  let peak = p[0] || 0, mdd = 0;
  for (const v of p) {
    if (v > peak) peak = v;
    if (peak > 0) mdd = Math.max(mdd, (peak - v) / peak);
  }
  return mdd * 100;
}

/** Beta of an asset against a benchmark return series. */
function beta(asset: number[], bench: number[]): number {
  const n = Math.min(asset.length, bench.length);
  if (n < 5) return 0;
  const a = asset.slice(-n), b = bench.slice(-n);
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let cov = 0, varb = 0;
  for (let i = 0; i < n; i++) { cov += (a[i] - ma) * (b[i] - mb); varb += (b[i] - mb) ** 2; }
  return varb === 0 ? 0 : cov / varb;
}

/** Analyst consensus + target from Finnhub (free tier). */
async function analystView(sym: string) {
  const key = process.env.FINNHUB_API_KEY?.trim();
  if (!key) return null;
  try {
    const [recRes, tgtRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/recommendation?symbol=${sym}&token=${key}`, { cache: 'no-store' }),
      fetch(`https://finnhub.io/api/v1/stock/price-target?symbol=${sym}&token=${key}`, { cache: 'no-store' }),
    ]);
    const rec = recRes.ok ? (await recRes.json())?.[0] : null;
    const tgt = tgtRes.ok ? await tgtRes.json() : null;
    if (!rec && !tgt?.targetMean) return null;
    const buy = num(rec?.strongBuy) + num(rec?.buy);
    const hold = num(rec?.hold);
    const sell = num(rec?.sell) + num(rec?.strongSell);
    const total = buy + hold + sell;
    return {
      symbol: sym,
      buy, hold, sell, total,
      consensus: total === 0 ? null : buy / total >= 0.6 ? 'Buy' : sell / total >= 0.4 ? 'Sell' : 'Hold',
      targetMean: num(tgt?.targetMean) || null,
      targetHigh: num(tgt?.targetHigh) || null,
      targetLow: num(tgt?.targetLow) || null,
    };
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return jsonNoStore({ ok: false }, { status: 503 });
  const userId = new URL(req.url).searchParams.get('userId') || '';
  if (!userId) return jsonNoStore({ ok: true, holdings: [], insights: [] });

  // ── gather holdings ──
  const [posRes, cpRes, utdRes] = await Promise.all([
    sb.from('positions').select('symbol, quantity, avg_entry_price').eq('user_id', userId),
    sb.from('crypto_positions').select('symbol, quantity, avg_buy_price').eq('user_id', userId),
    sb.from('user_trading_data').select('spot_crypto_state').eq('user_id', userId).maybeSingle(),
  ]);

  const cryptoMap = new Map<string, number>();
  for (const p of (((utdRes.data as any)?.spot_crypto_state?.positions) || [])) {
    const s = String(p.symbol || '').toUpperCase();
    if (s) cryptoMap.set(s, Math.max(cryptoMap.get(s) || 0, num(p.quantity)));
  }
  for (const r of (cpRes.data || []) as any[]) {
    const s = String(r.symbol).toUpperCase();
    cryptoMap.set(s, Math.max(cryptoMap.get(s) || 0, num(r.quantity)));
  }
  const stockMap = new Map<string, number>();
  for (const r of (posRes.data || []) as any[]) {
    stockMap.set(String(r.symbol).toUpperCase(), num(r.quantity));
  }

  const cSyms = [...cryptoMap.keys()], sSyms = [...stockMap.keys()];
  if (!cSyms.length && !sSyms.length) {
    return jsonNoStore({ ok: true, holdings: [], insights: [], totalValue: 0 });
  }

  // ── live prices for valuation ──
  const [cPrices, sPrices] = await Promise.all([
    cSyms.length ? fetchCryptoPrices(cSyms) : Promise.resolve({}),
    sSyms.length ? fetchStockPrices(sSyms) : Promise.resolve({}),
  ]);

  const holdings = [
    ...cSyms.map((s) => ({ symbol: s, kind: 'crypto' as const, quantity: cryptoMap.get(s) || 0, price: (cPrices as any)[s]?.price || 0 })),
    ...sSyms.map((s) => ({ symbol: s, kind: 'stock' as const, quantity: stockMap.get(s) || 0, price: (sPrices as any)[s]?.price || 0 })),
  ].map((h) => ({ ...h, value: h.quantity * h.price })).filter((h) => h.value > 0);

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  holdings.sort((a, b) => b.value - a.value);

  // ── price history for correlation (cap at 8 to stay fast) ──
  const top = holdings.slice(0, 8);
  const series = await Promise.all(
    top.map((h) => (h.kind === 'crypto' ? cryptoHistory(h.symbol) : stockHistory(h.symbol)))
  );
  const rets = series.map(returns);

  const pairs: any[] = [];
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      const c = corr(rets[i], rets[j]);
      if (rets[i].length >= 5 && rets[j].length >= 5) {
        pairs.push({ a: top[i].symbol, b: top[j].symbol, corr: Number(c.toFixed(2)) });
      }
    }
  }
  pairs.sort((x, y) => Math.abs(y.corr) - Math.abs(x.corr));

  // ── portfolio-level risk metrics ──
  const weights = top.map((h) => (totalValue ? h.value / totalValue : 0));
  const minLen = Math.min(...rets.map((r) => r.length).filter((n) => n > 0), 30);
  const pfRet: number[] = [];
  if (minLen >= 5) {
    for (let i = 0; i < minLen; i++) {
      let acc = 0, wsum = 0;
      rets.forEach((r, k) => {
        if (r.length >= minLen) { acc += (r[r.length - minLen + i] || 0) * weights[k]; wsum += weights[k]; }
      });
      pfRet.push(wsum > 0 ? acc / wsum : 0);
    }
  }
  const benchIdx = top.findIndex((h) => h.kind === 'stock');
  const bench = benchIdx >= 0 ? rets[benchIdx] : [];

  const risk = {
    volatility: Number(annualVol(pfRet).toFixed(1)),
    sharpe: Number(sharpe(pfRet).toFixed(2)),
    maxDrawdown: Number(maxDrawdown(
      pfRet.reduce((acc: number[], r) => { acc.push((acc[acc.length - 1] ?? 100) * (1 + r)); return acc; }, [100])
    ).toFixed(1)),
    perAsset: top.map((h, i) => ({
      symbol: h.symbol,
      kind: h.kind,
      volatility: Number(annualVol(rets[i]).toFixed(1)),
      beta: bench.length ? Number(beta(rets[i], bench).toFixed(2)) : null,
      maxDrawdown: Number(maxDrawdown(series[i]).toFixed(1)),
    })),
  };

  // ── analyst consensus for held stocks (free Finnhub tier) ──
  const analysts = (await Promise.all(
    top.filter((h) => h.kind === 'stock').slice(0, 5).map((h) => analystView(h.symbol))
  )).filter(Boolean);

  // ── exposure split ──
  const cryptoValue = holdings.filter((h) => h.kind === 'crypto').reduce((s, h) => s + h.value, 0);
  const stockValue = totalValue - cryptoValue;

  // ── insights ──
  const insights: any[] = [];
  const biggest = holdings[0];
  if (biggest && totalValue > 0) {
    const pct = (biggest.value / totalValue) * 100;
    if (pct >= 40) {
      insights.push({
        level: 'warn', title: 'Heavy concentration',
        body: `${biggest.symbol} is ${pct.toFixed(0)}% of your portfolio. A single bad day in one name would move your whole balance.`,
      });
    }
  }
  const hot = pairs.filter((p) => p.corr >= 0.7);
  if (hot.length) {
    const names = hot.slice(0, 3).map((p) => `${p.a}/${p.b}`).join(', ');
    insights.push({
      level: 'warn', title: 'Positions moving together',
      body: `${names} ${hot.length > 1 ? 'have' : 'has'} moved almost in lockstep over the last month. You may hold fewer independent bets than it looks.`,
    });
  }
  const diversifier = pairs.filter((p) => p.corr <= 0.2 && p.corr >= -1).slice(0, 1)[0];
  if (diversifier) {
    insights.push({
      level: 'good', title: 'Genuine diversification',
      body: `${diversifier.a} and ${diversifier.b} barely track each other (${diversifier.corr}). That pair is doing real work in your mix.`,
    });
  }
  if (totalValue > 0) {
    const cPct = (cryptoValue / totalValue) * 100;
    if (cPct >= 70) insights.push({ level: 'info', title: 'Crypto-weighted', body: `${cPct.toFixed(0)}% of your holdings are crypto — expect bigger daily swings than an equity-led mix.` });
    else if (cPct <= 10 && stockValue > 0) insights.push({ level: 'info', title: 'Equity-weighted', body: `Crypto is only ${cPct.toFixed(0)}% of your book. Your risk profile is closer to a traditional brokerage account.` });
  }
  if (holdings.length <= 2) {
    insights.push({ level: 'info', title: 'Small book', body: 'With one or two positions, most portfolio maths is noise. Correlation gets useful past four or five holdings.' });
  }

  if (risk.volatility > 0) {
    if (risk.volatility >= 60) insights.push({ level: 'warn', title: 'High volatility book', body: `Your holdings have swung about ${risk.volatility.toFixed(0)}% annualised. Position sizes that feel fine in calm weeks get loud in bad ones.` });
    else if (risk.volatility <= 20) insights.push({ level: 'good', title: 'Steady book', body: `Annualised volatility around ${risk.volatility.toFixed(0)}% — this mix is on the calmer end.` });
  }
  if (risk.sharpe !== 0) {
    insights.push({
      level: risk.sharpe >= 1 ? 'good' : risk.sharpe <= 0 ? 'warn' : 'info',
      title: `Return per unit of risk: ${risk.sharpe.toFixed(2)}`,
      body: risk.sharpe >= 1
        ? 'Above 1.0 means you were paid reasonably for the risk you carried over the window.'
        : risk.sharpe <= 0
        ? 'Negative over this window — you carried volatility without being paid for it.'
        : 'Middling. Most of the swing came from risk rather than edge.',
    });
  }
  const bullish = analysts.filter((a: any) => a?.consensus === 'Buy');
  if (bullish.length) {
    insights.push({
      level: 'info', title: 'Analyst consensus',
      body: `Street consensus is Buy on ${bullish.map((a: any) => a.symbol).join(', ')}. Consensus is a crowd opinion, not a forecast — it is often late.`,
    });
  }

  return jsonNoStore({
    ok: true,
    totalValue,
    risk,
    analysts,
    exposure: { crypto: cryptoValue, stocks: stockValue },
    holdings: holdings.map((h) => ({ ...h, weight: totalValue ? (h.value / totalValue) * 100 : 0 })),
    correlations: pairs.slice(0, 10),
    insights,
  });
}
