
'use client';

import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useStore } from '@/lib/supabase/store-supabase';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  History,
  CandlestickChart,
  AlertTriangle,
} from 'lucide-react';

import KYCGate from '@/components/KYCGate';

type Mode = 'active' | 'history';
type TF = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

type TradeRow = {
  id: string;
  user_id?: string;

  asset?: string | null;
  pair?: string | null;
  symbol?: string | null;

  asset_type?: string | null;
  market_type?: string | null;

  trade_type?: string | null;
  direction?: string | null;
  type?: string | null;
  direction_int?: number | null;

  investment?: number | string | null;
  margin_used?: number | string | null;
  amount?: number | string | null;

  multiplier?: number | string | null;
  leverage?: number | string | null;

  entry_price?: number | string | null;
  current_price?: number | string | null;
  exit_price?: number | string | null;

  liquidation_price?: number | string | null;
  stop_loss?: number | string | null;
  take_profit?: number | string | null;

  floating_pnl?: number | string | null;
  pnl?: number | string | null;
  profit_loss?: number | string | null;
  final_pnl?: number | string | null;

  pnl_percentage?: number | string | null;

  spread_cost?: number | string | null;
  status?: string | null;

  opened_at?: string | null;
  closed_at?: string | null;
  updated_at?: string | null;
};

type FxUiTrade = {
  id: string;
  asset: string;

  direction: 'buy' | 'sell';
  directionInt: 1 | -1;

  investment: number;
  multiplier: number;

  notional: number;
  entryPrice: number;
  currentPrice: number;

  liquidationPrice: number;
  stopLoss?: number;
  takeProfit?: number;

  pnl: number;
  pnlPercent: number;

  status: 'active' | 'closed' | 'liquidated' | 'stopped_out' | 'take_profit';

  openedAt?: string;
  closedAt?: string;
  updatedAt?: string;
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type DemoFxPair = {
  id: string;
  symbol: string;
  name: string;
  current_bid: number;
  current_ask: number;
  spread: number;
  mode: string;
  pip_size: number;
  price_updated_at: string;
  display_order?: number;
  seq?: number;
  active_session_id?: string | null;
};

type DemoFxTrade = {
  id: string;
  pair_id: string;
  symbol: string;
  direction_label: 'buy' | 'sell';
  direction: 1 | -1;
  investment: number;
  multiplier: number;
  entry_price: number;
  current_price: number | null;
  floating_pnl: number;
  final_pnl: number | null;
  status: string;
  close_reason: string | null;
  stop_loss: number | null;
  take_profit: number | null;
  opened_at: string;
  closed_at: string | null;
  exit_price: number | null;
  spread_cost: number;
};

type ChartPoint = {
  time: number;
  mid: number;
  bid: number;
  ask: number;
};

const FX_PAIRS = [
  // Majors
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'USD/CHF',
  'AUD/USD',
  'USD/CAD',
  'NZD/USD',
  // Minors (crosses)
  'EUR/GBP',
  'EUR/JPY',
  'GBP/JPY',
  'EUR/CHF',
  'CHF/JPY',
  'AUD/JPY',
  'CAD/JPY',
  'EUR/AUD',
  'EUR/CAD',
  'EUR/NZD',
  'GBP/AUD',
  'GBP/CAD',
  'GBP/CHF',
  'GBP/NZD',
  'AUD/CAD',
  'AUD/CHF',
  'AUD/NZD',
  'NZD/CAD',
  'NZD/CHF',
  'NZD/JPY',
  'CAD/CHF',
] as const;

const RARE_PAIR_PRESETS = [
  { symbol: 'USD/TRY', name: 'US Dollar / Turkish Lira' },
  { symbol: 'USD/ZAR', name: 'US Dollar / South African Rand' },
  { symbol: 'EUR/HUF', name: 'Euro / Hungarian Forint' },
  { symbol: 'USD/MXN', name: 'US Dollar / Mexican Peso' },
  { symbol: 'USD/SGD', name: 'US Dollar / Singapore Dollar' },
  { symbol: 'USD/HKD', name: 'US Dollar / Hong Kong Dollar' },
  { symbol: 'USD/NOK', name: 'US Dollar / Norwegian Krone' },
  { symbol: 'USD/SEK', name: 'US Dollar / Swedish Krona' },
  { symbol: 'USD/DKK', name: 'US Dollar / Danish Krone' },
  { symbol: 'USD/PLN', name: 'US Dollar / Polish Zloty' },
  { symbol: 'USD/CZK', name: 'US Dollar / Czech Koruna' },
  { symbol: 'EUR/TRY', name: 'Euro / Turkish Lira' },
  { symbol: 'EUR/ZAR', name: 'Euro / South African Rand' },
  { symbol: 'EUR/PLN', name: 'Euro / Polish Zloty' },
  { symbol: 'EUR/NOK', name: 'Euro / Norwegian Krone' },
  { symbol: 'EUR/SEK', name: 'Euro / Swedish Krona' },
  { symbol: 'GBP/ZAR', name: 'British Pound / South African Rand' },
  { symbol: 'AUD/SGD', name: 'Australian Dollar / Singapore Dollar' },
  { symbol: 'USD/THB', name: 'US Dollar / Thai Baht' },
  { symbol: 'USD/INR', name: 'US Dollar / Indian Rupee' },
  { symbol: 'USD/CNH', name: 'US Dollar / Chinese Yuan (Offshore)' },
] as const;

const ALL_UI_PAIRS = [...FX_PAIRS, ...RARE_PAIR_PRESETS.map((p) => p.symbol)] as const;
void ALL_UI_PAIRS;

const MULTIPLIERS = [10, 25, 50, 100, 200, 500, 1000] as const;

const TIMEFRAMES: { label: string; value: TF; pollMs: number }[] = [
  { label: '1m', value: '1m', pollMs: 12000 },
  { label: '5m', value: '5m', pollMs: 15000 },
  { label: '15m', value: '15m', pollMs: 25000 },
  { label: '1h', value: '1h', pollMs: 35000 },
  { label: '4h', value: '4h', pollMs: 50000 },
  { label: '1D', value: '1D', pollMs: 65000 },
];

const DEFAULT_OPEN_VIEW_SECONDS = 5 * 60;
const DEFAULT_OPEN_VIEW_BARS = 8;

// ===============================
// helpers
// ===============================
function clampNum(v: unknown, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function fmt(n: number, dp = 2) {
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(dp);
}

function isRareUiPair(symbol: string) {
  return RARE_PAIR_PRESETS.some((p) => p.symbol === symbol);
}

function normalizeEpochSeconds(value: unknown): number {
  const n = clampNum(value, 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > 2_000_000_000_000) return Math.floor(n / 1000);
  if (n > 20_000_000_000) return Math.floor(n / 1000);
  return Math.floor(n);
}

function getPairDecimalsFromPip(pip?: number | null) {
  const v = Number(pip || 0.0001);
  if (!Number.isFinite(v) || v <= 0) return 4;

  const s = String(v);
  if (s.includes('e-')) {
    const exp = Number(s.split('e-')[1]);
    return Number.isFinite(exp) ? exp : 4;
  }
  if (s.includes('.')) return s.split('.')[1].length;
  return 4;
}

function chartPointsToCandles(points: ChartPoint[]): Candle[] {
  if (!Array.isArray(points) || !points.length) return [];

  return points
    .map((p, i) => {
      const prev = points[i - 1];
      const open = prev ? clampNum(prev.mid, 0) : clampNum(p.mid, 0);
      const close = clampNum(p.mid, 0);
      const bid = clampNum(p.bid, close);
      const ask = clampNum(p.ask, close);
      const time = normalizeEpochSeconds(p.time);

      if (!(time > 0) || !(close > 0) || !(open > 0)) return null;

      return {
        time,
        open,
        high: Math.max(open, close, bid, ask),
        low: Math.min(open, close, bid, ask),
        close,
      } satisfies Candle;
    })
    .filter((x): x is Candle => !!x);
}

function toDirInt(row: TradeRow): 1 | -1 {
  const di = clampNum(row.direction_int, 0);
  if (di === 1 || di === -1) return di as 1 | -1;

  const s = String(row.direction ?? row.type ?? '').toLowerCase();
  return s === 'buy' || s === 'long' || s === 'up' ? 1 : -1;
}

function toDirLabel(di: 1 | -1): 'buy' | 'sell' {
  return di === 1 ? 'buy' : 'sell';
}

function normStatus(s: unknown): FxUiTrade['status'] {
  const v = String(s ?? '').toLowerCase();
  if (v === 'open') return 'active';
  if (v === 'active') return 'active';
  if (v === 'closed') return 'closed';
  if (v === 'liquidated') return 'liquidated';
  if (v === 'stopped_out') return 'stopped_out';
  if (v === 'take_profit') return 'take_profit';
  return 'closed';
}

function dbRowToUi(row: TradeRow): FxUiTrade {
  const asset = String(row.asset ?? row.pair ?? row.symbol ?? '').trim();

  const directionInt = toDirInt(row);
  const direction = toDirLabel(directionInt);

  const marketType = String(row.market_type ?? '').toLowerCase();
  const tradeType = String(row.trade_type ?? row.type ?? '').toLowerCase();
  const isFxMargin = marketType === 'fx' && tradeType === 'margin';

  const entryPrice = clampNum(row.entry_price, 0);
  const currentPrice = clampNum(row.current_price ?? row.entry_price, entryPrice);

  const leverage = clampNum(row.leverage ?? row.multiplier, 1);
  const notionalFromDb = clampNum(row.amount, 0);

  let stake =
    clampNum(row.margin_used, 0) > 0 ? clampNum(row.margin_used, 0) : clampNum(row.investment, 0);

  if (!(stake > 0) && isFxMargin && notionalFromDb > 0 && leverage > 0) {
    stake = notionalFromDb / leverage;
  }

  const notional = isFxMargin
    ? notionalFromDb > 0
      ? notionalFromDb
      : stake * leverage
    : clampNum(row.investment, 0) * clampNum(row.multiplier, 1);

  const status = normStatus(row.status);

  const pnlFromDb =
    row.final_pnl != null
      ? clampNum(row.final_pnl, 0)
      : row.floating_pnl != null
        ? clampNum(row.floating_pnl, 0)
        : row.pnl != null
          ? clampNum(row.pnl, 0)
          : row.profit_loss != null
            ? clampNum(row.profit_loss, 0)
            : 0;

  const exposure = isFxMargin ? notional : stake * clampNum(row.multiplier, 1);
  const calc =
    entryPrice > 0 ? directionInt * exposure * ((currentPrice - entryPrice) / entryPrice) : 0;

  const pnl = pnlFromDb !== 0 ? pnlFromDb : calc;
  const pnlPercent = stake > 0 ? (pnl / stake) * 100 : 0;

  return {
    id: row.id,
    asset,
    direction,
    directionInt,
    investment: stake,
    multiplier: isFxMargin ? leverage : clampNum(row.multiplier, 1),
    notional,
    entryPrice,
    currentPrice,
    liquidationPrice: clampNum(row.liquidation_price, 0),
    stopLoss: row.stop_loss != null ? clampNum(row.stop_loss, 0) : undefined,
    takeProfit: row.take_profit != null ? clampNum(row.take_profit, 0) : undefined,
    pnl,
    pnlPercent,
    status,
    openedAt: row.opened_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function demoTradeToUi(trade: DemoFxTrade, uiSymbol: string): FxUiTrade {
  const investment = clampNum(trade.investment, 0);
  const multiplier = clampNum(trade.multiplier, 1);
  const entryPrice = clampNum(trade.entry_price, 0);
  const currentPrice = clampNum(trade.current_price ?? trade.entry_price, 0);

  let pnl: number;
  if (trade.status === 'open') {
    pnl = clampNum(trade.floating_pnl, 0);
    if (pnl < -investment && investment > 0) pnl = -investment;
  } else {
    pnl = clampNum(trade.final_pnl ?? trade.floating_pnl, 0);
    if (pnl < -investment && investment > 0) pnl = -investment;
  }

  let status: FxUiTrade['status'] = 'closed';
  if (trade.status === 'open') status = 'active';
  else if (trade.status === 'liquidated' || trade.close_reason === 'liquidation') status = 'liquidated';
  else if (trade.status === 'stopped_out' || trade.close_reason === 'stop_loss') status = 'stopped_out';
  else if (trade.status === 'take_profit' || trade.close_reason === 'take_profit') status = 'take_profit';

  return {
    id: trade.id,
    asset: uiSymbol,
    direction: trade.direction_label,
    directionInt: trade.direction,
    investment,
    multiplier,
    notional: investment * multiplier,
    entryPrice,
    currentPrice,
    liquidationPrice: 0,
    stopLoss: trade.stop_loss != null ? clampNum(trade.stop_loss, 0) : undefined,
    takeProfit: trade.take_profit != null ? clampNum(trade.take_profit, 0) : undefined,
    pnl,
    pnlPercent: investment > 0 ? (pnl / investment) * 100 : 0,
    status,
    openedAt: trade.opened_at ?? undefined,
    closedAt: trade.closed_at ?? undefined,
    updatedAt: trade.closed_at ?? trade.opened_at ?? undefined,
  };
}

function makeIdempotencyKey(): string {
  try {
    const key = globalThis.crypto?.randomUUID?.();
    if (key) return key;
  } catch {}
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// rare/demo rule: always use ASK, fallback to BID
function getRareUnifiedPrice(
  pairLike:
    | Pick<DemoFxPair, 'current_bid' | 'current_ask'>
    | { current_bid?: number | null; current_ask?: number | null }
    | null
    | undefined
) {
  const ask = clampNum(pairLike?.current_ask, 0);
  const bid = clampNum(pairLike?.current_bid, 0);
  if (ask > 0) return ask;
  if (bid > 0) return bid;
  return 0;
}

// ===============================
// JWT decode (token caching)
// ===============================
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getProjectRefFromEnv(): string | null {
  try {
    const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!u) return null;
    const host = new URL(u).hostname;
    const ref = host.split('.')[0];
    return ref || null;
  } catch {
    return null;
  }
}

function extractAccessTokenFromStoredJson(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as any;
    const token =
      parsed?.access_token ??
      parsed?.currentSession?.access_token ??
      parsed?.session?.access_token ??
      parsed?.data?.session?.access_token ??
      parsed?.value?.access_token ??
      null;
    return typeof token === 'string' && token.length > 20 ? token : null;
  } catch {
    return null;
  }
}

function readStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;

  const projectRef = getProjectRefFromEnv();
  const expectedSbKey = projectRef ? `sb-${projectRef}-auth-token` : null;
  const customKey = 'swifttrade-sb-auth';

  const pick = (store: Storage | null) => {
    if (!store) return null;

    const rawCustom = store.getItem(customKey);
    if (rawCustom) {
      const t = extractAccessTokenFromStoredJson(rawCustom);
      if (t) return t;
    }

    if (expectedSbKey) {
      const raw = store.getItem(expectedSbKey);
      if (raw) {
        const t = extractAccessTokenFromStoredJson(raw);
        if (t) return t;
      }
    }

    try {
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (!k) continue;

        if (k === customKey || (k.startsWith('sb-') && k.endsWith('-auth-token'))) {
          const raw = store.getItem(k);
          if (!raw) continue;

          const token = extractAccessTokenFromStoredJson(raw);
          if (!token) continue;

          if (projectRef) {
            const payload = decodeJwtPayload(token);
            const iss = typeof payload?.iss === 'string' ? payload.iss : '';
            if (iss && !iss.includes(projectRef)) continue;
          }

          return token;
        }
      }
    } catch {}

    return null;
  };

  return pick(window.sessionStorage) || pick(window.localStorage);
}

// ===============================
// FX chart persistence (24h local cache)
// ===============================
const STORAGE_PREFIX = 'swifttrade:fx';
const LOCAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LOCAL_TICK_MAX_POINTS = 9000;
const LOCAL_TICK_SAMPLE_MS = 10_000;

type Tick = { t: number; p: number };
type LocalEnvelope<T> = { data: T; savedAt: number; expiresAt: number };

function parseStoredEnvelope<T>(raw: string): { ok: true; data: T } | { ok: false; expired?: boolean } {
  try {
    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === 'object' &&
      'data' in parsed &&
      'expiresAt' in parsed
    ) {
      const expiresAt = clampNum((parsed as any).expiresAt, 0);
      if (expiresAt > 0 && Date.now() > expiresAt) {
        return { ok: false, expired: true };
      }
      return { ok: true, data: (parsed as LocalEnvelope<T>).data };
    }

    return { ok: true, data: parsed as T };
  } catch {
    return { ok: false };
  }
}

function cacheGet<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined') return null;

    const rawLocal = window.localStorage.getItem(key);
    if (rawLocal) {
      const parsed = parseStoredEnvelope<T>(rawLocal);
      if (parsed.ok) return parsed.data;
      if (parsed.expired) {
        try {
          window.localStorage.removeItem(key);
        } catch {}
      }
    }

    const rawSession = window.sessionStorage.getItem(key);
    if (rawSession) {
      const parsed = parseStoredEnvelope<T>(rawSession);
      if (parsed.ok) {
        try {
          cacheSet(key, parsed.data);
          window.sessionStorage.removeItem(key);
        } catch {}
        return parsed.data;
      }
      if (parsed.expired) {
        try {
          window.sessionStorage.removeItem(key);
        } catch {}
      }
    }
  } catch {}

  return null;
}

function cacheSet<T>(key: string, data: T, ttlMs = LOCAL_CACHE_TTL_MS) {
  try {
    if (typeof window === 'undefined') return;

    const payload: LocalEnvelope<T> = {
      data,
      savedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}

function candlesCacheKey(pair: string, tf: TF) {
  return `${STORAGE_PREFIX}:candles:${pair}:${tf}`;
}

function ticksCacheKey(pair: string) {
  return `${STORAGE_PREFIX}:ticks:${pair}`;
}

function tfToMs(tf: TF) {
  switch (tf) {
    case '1m':
      return 60_000;
    case '5m':
      return 5 * 60_000;
    case '15m':
      return 15 * 60_000;
    case '1h':
      return 60 * 60_000;
    case '4h':
      return 4 * 60 * 60_000;
    case '1D':
      return 24 * 60 * 60_000;
    default:
      return 5 * 60_000;
  }
}

function minimum24hCandleCount(tf: TF) {
  const base = Math.ceil(LOCAL_CACHE_TTL_MS / tfToMs(tf));
  const buffer = Math.max(2, Math.ceil(base * 0.1));
  return Math.min(2000, base + buffer);
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCandlesFromTicksFx(ticks: Tick[], intervalMs: number, count: number): Candle[] {
  if (!ticks?.length) return [];

  const now = Date.now();
  const end = Math.floor(now / intervalMs) * intervalMs;
  const start = end - count * intervalMs;

  const sliced = ticks
    .filter((x) => x.t >= start - intervalMs && x.t <= end + intervalMs)
    .sort((a, b) => a.t - b.t);

  if (!sliced.length) return [];

  let idx = 0;
  let lastClose = sliced[0].p;

  const out: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const b0 = start + i * intervalMs;
    const b1 = b0 + intervalMs;

    const bucket: Tick[] = [];
    while (idx < sliced.length && sliced[idx].t < b0) {
      lastClose = sliced[idx].p;
      idx++;
    }
    while (idx < sliced.length && sliced[idx].t >= b0 && sliced[idx].t < b1) {
      bucket.push(sliced[idx]);
      idx++;
    }

    if (!bucket.length) {
      const p = lastClose;
      out.push({ time: Math.floor(b0 / 1000), open: p, high: p, low: p, close: p });
      continue;
    }

    const o = bucket[0].p;
    const c = bucket[bucket.length - 1].p;
    let h = o;
    let l = o;
    for (const x of bucket) {
      if (x.p > h) h = x.p;
      if (x.p < l) l = x.p;
    }

    lastClose = c;
    out.push({ time: Math.floor(b0 / 1000), open: o, high: h, low: l, close: c });
  }

  return out.filter((x) => x.open > 0 && x.high > 0 && x.low > 0 && x.close > 0);
}

function generateSyntheticCandlesFx(
  seedPrice: number,
  intervalMs: number,
  count: number,
  seedKey: string
): Candle[] {
  const p0 = Number.isFinite(seedPrice) && seedPrice > 0 ? seedPrice : 1;
  const rng = mulberry32(hashStr(seedKey));

  const now = Date.now();
  const end = Math.floor(now / intervalMs) * intervalMs;
  const start = end - count * intervalMs;

  const baseVol = Math.max(0.00001, p0 * 0.0015);
  let last = p0;

  const out: Candle[] = [];
  for (let i = 0; i < count; i++) {
    const t = start + i * intervalMs;

    const drift = (rng() - 0.5) * baseVol;
    const o = last;
    const c = Math.max(0.00001, o + drift);

    const wick = baseVol * (0.4 + rng());
    const h = Math.max(o, c) + wick * rng();
    const l = Math.max(0.00001, Math.min(o, c) - wick * rng());

    out.push({ time: Math.floor(t / 1000), open: o, high: h, low: l, close: c });
    last = c;
  }

  return out;
}

function aggregateCandles(candles: Candle[], targetTf: TF): Candle[] {
  if (!Array.isArray(candles) || !candles.length) return [];

  const targetBucketSec = Math.floor(tfToMs(targetTf) / 1000);
  if (!(targetBucketSec > 0)) return candles;

  const byBucket = new Map<number, Candle>();

  for (const c of candles.sort((a, b) => a.time - b.time)) {
    const time = normalizeEpochSeconds(c.time);
    if (!(time > 0)) continue;

    const bucket = Math.floor(time / targetBucketSec) * targetBucketSec;
    const existing = byBucket.get(bucket);

    if (!existing) {
      byBucket.set(bucket, {
        time: bucket,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      });
      continue;
    }

    existing.high = Math.max(existing.high, c.high);
    existing.low = Math.min(existing.low, c.low);
    existing.close = c.close;
    if (c.volume != null) {
      existing.volume = (existing.volume || 0) + c.volume;
    }
  }

  return Array.from(byBucket.values()).sort((a, b) => a.time - b.time);
}

function pushFxTick(pair: string, price: number) {
  try {
    if (!pair || !Number.isFinite(price) || price <= 0) return;

    const key = ticksCacheKey(pair);
    const now = Date.now();
    const minTs = now - LOCAL_CACHE_TTL_MS;

    const prev = cacheGet<Tick[]>(key) || [];
    const cleaned = prev.filter((x) => x && x.t >= minTs && Number.isFinite(x.p) && x.p > 0);

    if (cleaned.length) {
      const last = cleaned[cleaned.length - 1];
      if (now - last.t < LOCAL_TICK_SAMPLE_MS) {
        cleaned[cleaned.length - 1] = { t: now, p: price };
        cacheSet(key, cleaned.slice(-LOCAL_TICK_MAX_POINTS));
        return;
      }
    }

    const next = [...cleaned, { t: now, p: price }].slice(-LOCAL_TICK_MAX_POINTS);
    cacheSet(key, next);
  } catch {}
}

// ===============================
// OANDA candles endpoint (cache/budget aware)
// ===============================
class CandlesError extends Error {
  status: number;
  retryAfterMs?: number;
  constructor(message: string, status: number, retryAfterMs?: number) {
    super(message);
    this.name = 'CandlesError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

type CandlesFetchResult = {
  candles: Candle[];
  cache: string | null;
  stale?: boolean;
};

async function fetchFxCandles(
  display: string,
  tf: TF,
  limit = 260,
  signal?: AbortSignal,
  fresh?: boolean
): Promise<CandlesFetchResult> {
  const url =
    `/api/market/fx/candles?display=${encodeURIComponent(display)}` +
    `&tf=${encodeURIComponent(tf)}&limit=${limit}` +
    (fresh ? `&fresh=1` : ``);

  const res = await fetch(url, { method: 'GET', cache: 'no-store', signal });

  const cacheHeader = res.headers.get('x-cache');
  const text = await res.text();

  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (res.ok && json && json.ok === false) {
    throw new CandlesError(json?.code || json?.error || 'Candles failed (ok:false)', 502);
  }

  if (res.status === 429) {
    const raHeader = res.headers.get('retry-after');
    const raSecFromHeader = raHeader ? clampNum(raHeader, 0) : 0;
    const raSecFromBody = json?.retryAfterSec != null ? clampNum(json.retryAfterSec, 0) : 0;
    const raSec = Math.max(raSecFromHeader, raSecFromBody, 5);
    throw new CandlesError(
      json?.code || 'Rate limited (candles).',
      429,
      Math.max(1000, raSec * 1000)
    );
  }

  if (!res.ok) {
    throw new CandlesError(
      json?.code || json?.error || json?.message || `Candles failed (${res.status})`,
      res.status
    );
  }

  const rows: any[] = Array.isArray(json?.candles) ? json.candles : [];

  const mapped: (Candle | null)[] = rows.map((r) => {
    if (!r || typeof r !== 'object') return null;

    const t = (r.time ?? r.t ?? r.timestamp ?? r.ts ?? r.open_time ?? r.openTime) as any;
    let timeSec = 0;

    if (typeof t === 'number') timeSec = t > 2_000_000_000 ? Math.floor(t / 1000) : Math.floor(t);
    if (typeof t === 'string') {
      const d = Date.parse(t);
      if (Number.isFinite(d)) timeSec = Math.floor(d / 1000);
    }

    const open = clampNum((r.open ?? r.o) as any, NaN);
    const high = clampNum((r.high ?? r.h) as any, NaN);
    const low = clampNum((r.low ?? r.l) as any, NaN);
    const close = clampNum((r.close ?? r.c) as any, NaN);
    const volRaw = r.volume ?? r.v;
    const vol = volRaw != null ? clampNum(volRaw, 0) : undefined;

    if (!Number.isFinite(timeSec) || timeSec <= 0) return null;
    if (![open, high, low, close].every((x) => Number.isFinite(x))) return null;

    const base: Candle = { time: timeSec, open, high, low, close };
    return vol != null ? { ...base, volume: vol } : base;
  });

  return {
    candles: mapped.filter((x): x is Candle => x !== null).sort((a, b) => a.time - b.time),
    cache: cacheHeader,
    stale: !!json?.stale,
  };
}

// ===============================
// market-gateway WS (OANDA ticks)
// ===============================
function displayToOandaInstrument(display: string): string {
  const d = String(display || '').trim().toUpperCase();
  if (!d) return '';
  const clean = d.startsWith('OANDA:') ? d.slice(6) : d;
  return clean.replace(/\s+/g, '').split('/').join('_').split('-').join('_');
}

function normalizeWsUrl(raw: string) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('https://')) return 'wss://' + s.slice('https://'.length);
  if (s.startsWith('http://')) return 'ws://' + s.slice('http://'.length);
  return s;
}

const DEFAULT_GATEWAY_WS = 'wss://web-socket-lc3r.onrender.com';

function getGatewayUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_MARKET_WS_URL ||
    process.env.NEXT_PUBLIC_MARKET_GATEWAY_URL ||
    DEFAULT_GATEWAY_WS;

  return normalizeWsUrl(raw);
}

type GatewayMsg =
  | { type: 'hello' }
  | { type: 'fx_tick'; instrument: string; bid?: number; ask?: number; mid?: number; ts?: number }
  | { type: 'subscribed'; stocks?: string[]; fx?: string[] }
  | Record<string, any>;

export default function FXTradePage() {
  return (
    <KYCGate action="trade FX">
      <FXTradeInner />
    </KYCGate>
  );
}

function FXTradeInner() {
  const { refreshUser } = useStore();

  const [mode, setMode] = useState<Mode>('active');
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [balance, setBalance] = useState<number>(0);

  const [normalTrades, setNormalTrades] = useState<FxUiTrade[]>([]);
  const tradesRef = useRef<FxUiTrade[]>([]);
  useEffect(() => {
    tradesRef.current = normalTrades;
  }, [normalTrades]);

  const [exitDraft, setExitDraft] = useState<Record<string, string>>({});

  const [asset, setAsset] = useState<string>('EUR/USD');
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [investment, setInvestment] = useState<string>('50');
  const [multiplier, setMultiplier] = useState<number>(100);
  const [marketPrice, setMarketPrice] = useState<string>('1.00000');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [takeProfit, setTakeProfit] = useState<string>('');

  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showMobileTrades, setShowMobileTrades] = useState(false);

  const [tf, setTf] = useState<TF>('5m');
  const [chartNote, setChartNote] = useState<string | null>(null);
  const [lastClose, setLastClose] = useState<number | null>(null);
  const [candlesCacheLabel, setCandlesCacheLabel] = useState<string>('—');

  const [wsOn, setWsOn] = useState(false);
  const [wsNote, setWsNote] = useState<string | null>(null);

  const [rarePairs, setRarePairs] = useState<DemoFxPair[]>([]);
  const [rareChart, setRareChart] = useState<Record<string, ChartPoint[]>>({});
  void rareChart;
  void setRareChart;
  const [rareTrades, setRareTrades] = useState<DemoFxTrade[]>([]);

  const assetRef = useRef(asset);
  const tfRef = useRef(tf);
  const marketEditingRef = useRef(false);

  useEffect(() => {
    assetRef.current = asset;
  }, [asset]);

  useEffect(() => {
    tfRef.current = tf;
  }, [tf]);

  const rareMode = useMemo(() => isRareUiPair(asset), [asset]);
  const rareModeRef = useRef(false);
  useEffect(() => {
    rareModeRef.current = rareMode;
  }, [rareMode]);

  useEffect(() => {
    initialChartViewKeyRef.current = '';
  }, [asset, tf, rareMode]);

  const sortedRarePairs = useMemo(
    () => [...rarePairs].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [rarePairs]
  );

  const rareBackendSymbolToUi = useMemo(() => {
    const map: Record<string, { symbol: string; name: string }> = {};
    RARE_PAIR_PRESETS.forEach((p) => {
      map[p.symbol] = { symbol: p.symbol, name: p.name };
    });
    return map;
  }, []);

  const rareUiSymbolToPair = useMemo(() => {
    const map: Record<string, DemoFxPair> = {};
    sortedRarePairs.forEach((pair) => {
      map[pair.symbol] = pair;
    });
    return map;
  }, [sortedRarePairs]);

  const activeRarePair = useMemo(() => {
    if (!rareMode) return null;
    return rareUiSymbolToPair[asset] || null;
  }, [rareMode, rareUiSymbolToPair, asset]);

  const activeRarePairUi = useMemo(() => {
    if (!activeRarePair) return null;
    return rareBackendSymbolToUi[activeRarePair.symbol] || { symbol: asset, name: asset };
  }, [activeRarePair, rareBackendSymbolToUi, asset]);

  const rareUiTrades = useMemo(() => {
    return rareTrades.map((trade) => {
      const ui = rareBackendSymbolToUi[trade.symbol] || { symbol: trade.symbol, name: trade.symbol };
      return demoTradeToUi(trade, ui.symbol);
    });
  }, [rareTrades, rareBackendSymbolToUi]);

  const displayTradesBase = rareMode ? rareUiTrades : normalTrades;

  const filteredTrades = useMemo(() => {
    return mode === 'active'
      ? displayTradesBase.filter((t) => t.status === 'active')
      : displayTradesBase;
  }, [displayTradesBase, mode]);

  const sortedTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => {
      const at = Date.parse(a.openedAt || a.updatedAt || '') || 0;
      const bt = Date.parse(b.openedAt || b.updatedAt || '') || 0;
      return bt - at;
    });
  }, [filteredTrades]);

  // rare/demo pricing rule: market price input always follows ASK
  useEffect(() => {
    if (!rareMode || !activeRarePair) return;
    const dp = getPairDecimalsFromPip(activeRarePair.pip_size);
    const px = getRareUnifiedPrice(activeRarePair);

    if (px > 0 && !marketEditingRef.current) {
      setMarketPrice(px.toFixed(dp));
    }
  }, [rareMode, activeRarePair]);

  const chartWrapRef = useRef<HTMLDivElement | null>(null);
  const chartApiRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const resizeObsRef = useRef<ResizeObserver | null>(null);
  const chartAbortRef = useRef<AbortController | null>(null);
  const chartInFlightRef = useRef(false);

  const lastCandleRef = useRef<Candle | null>(null);
  const initialChartViewKeyRef = useRef<string>('');

  const pollTimeoutRef = useRef<number | null>(null);
  const retryAfterMsRef = useRef<number>(0);
  const unmountedRef = useRef(false);

  const lastPushAtRef = useRef<number>(0);
  const lastPushedPriceRef = useRef<number | null>(null);

  const tokenCacheRef = useRef<{ token: string | null; expMs: number }>({ token: null, expMs: 0 });

  const canUseSupabase =
    (typeof isSupabaseConfigured === 'function' ? isSupabaseConfigured() : !!isSupabaseConfigured) &&
    !!supabase;

  const headerAuthToken = async (): Promise<string | null> => {
    if (!canUseSupabase) return null;

    const cached = tokenCacheRef.current;
    if (cached.token && Date.now() < cached.expMs - 60_000) return cached.token;

    const setCache = (tok: string) => {
      const payload = decodeJwtPayload(tok);
      const expSec = clampNum(payload?.exp, 0);
      const expMs = expSec > 0 ? expSec * 1000 : Date.now() + 10 * 60_000;
      tokenCacheRef.current = { token: tok, expMs };
    };

    try {
      const { data, error: sErr } = await supabase.auth.getSession();
      if (!sErr) {
        const token = data.session?.access_token ?? null;
        if (token) {
          setCache(token);
          return token;
        }
      }
    } catch {}

    try {
      const { data } = await supabase.auth.refreshSession();
      const token = data.session?.access_token ?? null;
      if (token) {
        setCache(token);
        return token;
      }
    } catch {}

    const raw = readStoredAccessToken();
    if (raw) {
      setCache(raw);
      return raw;
    }

    return null;
  };

  const pushPriceToServer = async (pair: string, px: number) => {
    try {
      const currentAsset = assetRef.current;
      if (rareModeRef.current || isRareUiPair(currentAsset) || isRareUiPair(pair)) return;
      if (pair !== currentAsset) return;

      const hasActive = tradesRef.current.some((t) => t.status === 'active' && t.asset === pair);
      if (!hasActive) return;

      const now = Date.now();
      const minPushMs = 8000;
      if (now - lastPushAtRef.current < minPushMs) return;

      const last = lastPushedPriceRef.current;
      if (last != null && Math.abs(px - last) < 0.00001) return;

      const token = await headerAuthToken();
      if (!token) return;

      lastPushAtRef.current = now;
      lastPushedPriceRef.current = px;

      await fetch('/api/trades', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_price', asset: pair, price: px }),
        cache: 'no-store',
      });
    } catch {}
  };

  const loadNormalTrades = async () => {
    setError(null);
    setLoading(true);

    try {
      const token = await headerAuthToken();
      if (!token) throw new Error('Missing API token. Please sign in again.');

      const res = await fetch(`/api/trades?limit=200&mode=all`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || `Failed to load trades (${res.status})`);
      }

      setBalance(clampNum(json?.balance ?? json?.balance_available ?? 0));

      const rows: TradeRow[] = Array.isArray(json?.trades) ? (json.trades as TradeRow[]) : [];
      const fxRows = rows.filter((r) => String(r.market_type ?? '').toLowerCase() === 'fx');
      const parsed = fxRows.map(dbRowToUi).filter((t) => !!t.asset);

      startTransition(() => {
        setNormalTrades(parsed);
      });

      try {
        await refreshUser();
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const rareChartHashRef = useRef<string>('');
  const rareSeqRef = useRef<number>(0);
  const rareSessionIdRef = useRef<string | null>(null);

  const loadRareMode = async () => {
    setError(null);

    try {
      const token = await headerAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const pairsRes = await fetch('/api/demo-fx/pairs', { headers, cache: 'no-store' });
      const pairsJson = await pairsRes.json().catch(() => null);
      const nextPairs: DemoFxPair[] = Array.isArray(pairsJson?.pairs) ? pairsJson.pairs : [];
      setRarePairs(nextPairs);

      const sorted = [...nextPairs].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
      const uiToBackend: Record<string, DemoFxPair> = {};
      sorted.forEach((pair) => {
        uiToBackend[pair.symbol] = pair;
      });

      const currentUiAsset = assetRef.current;
      const currentPair = uiToBackend[currentUiAsset] || null;
      if (!currentPair) return;

      const ticksUrl = `/api/demo-fx/ticks?pair_id=${currentPair.id}&since_seq=${rareSeqRef.current}`;
      const ticksRes = await fetch(ticksUrl, { headers, cache: 'no-store' });
      const ticksData = await ticksRes.json().catch(() => null);
      if (!ticksData?.pair) return;

      if (assetRef.current !== currentUiAsset) return;

      const serverSeq = Number(ticksData.pair.seq || 0);
      const serverSessionId = ticksData.pair.session_id || null;
      const sessionChanged = serverSessionId !== rareSessionIdRef.current;

      if (sessionChanged) {
        rareSessionIdRef.current = serverSessionId;
        rareSeqRef.current = 0;
        rareChartHashRef.current = '';
        try {
          chartApiRef.current?.remove?.();
        } catch {}
        chartApiRef.current = null;
        candleSeriesRef.current = null;
        lastCandleRef.current = null;
        initialChartViewKeyRef.current = '';
      }

      const dp = getPairDecimalsFromPip(currentPair.pip_size);
      const bid = clampNum(ticksData.pair.bid, 0);
      const ask = clampNum(ticksData.pair.ask, 0);
      const mid = clampNum(ticksData.pair.mid, 0);

      const rareUnifiedPrice = getRareUnifiedPrice({
        current_bid: bid,
        current_ask: ask,
      });

      if (rareUnifiedPrice > 0 && !marketEditingRef.current) {
        setMarketPrice(rareUnifiedPrice.toFixed(dp));
      }
      if (rareUnifiedPrice > 0) setLastClose(rareUnifiedPrice);

      if (bid > 0 && ask > 0) {
        setRarePairs((prev) =>
          prev.map((p) =>
            p.id === currentPair.id
              ? { ...p, current_bid: bid, current_ask: ask, seq: ticksData.pair.seq }
              : p
          )
        );
      }

      try {
        await initChartIfNeeded();
      } catch (e: any) {
        console.error('[fx-chart] rare init failed:', e);
        return;
      }

      const tfCur = tfRef.current;
      const rareFetchTf: TF = tfCur === '1m' ? '1m' : '5m';
      const rareFetchLimit = minimum24hCandleCount(rareFetchTf);

      const candleUrl =
        `/api/demo-fx/candles?pair_id=${currentPair.id}` +
        `&tf=${encodeURIComponent(rareFetchTf)}` +
        `&limit=${rareFetchLimit}`;

      const candlesRes = await fetch(candleUrl, { headers, cache: 'no-store' });
      const candlesData = await candlesRes.json().catch(() => null);

      if (assetRef.current !== currentUiAsset) return;

      const baseCandles: Candle[] = (candlesData?.candles || [])
        .map((c: any) => ({
          time: Number(c.time),
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }))
        .filter((c: Candle) => c.time > 0 && c.open > 0);

      const candles =
        rareFetchTf === tfCur ? baseCandles : aggregateCandles(baseCandles, tfCur);

      if (candles.length > 0) {
        const lastC = candles[candles.length - 1];
        const chartHash = `${candles.length}:${lastC.time}:${mid.toFixed(6)}:${serverSeq}:${tfCur}`;

        if (chartHash !== rareChartHashRef.current) {
          rareChartHashRef.current = chartHash;
          setCandlesCacheLabel('SESSION');
          const session = ticksData.session;
          setChartNote(session ? `${session.session_type} session` : 'Demo mode');

          if (mid > 0) {
            const intervalMs = tfToMs(tfCur);
            const nowBucketMs = Math.floor(Date.now() / intervalMs) * intervalMs;
            const nowBucketSec = Math.floor(nowBucketMs / 1000);

            if (lastC.time < nowBucketSec) {
              candles.push({
                time: nowBucketSec,
                open: lastC.close,
                high: Math.max(lastC.close, mid),
                low: Math.min(lastC.close, mid),
                close: mid,
              });
            } else {
              lastC.high = Math.max(lastC.high, mid);
              lastC.low = Math.min(lastC.low, mid);
              lastC.close = mid;
            }
          }

          setChartData(candles);
        } else {
          if (mid > 0 && candleSeriesRef.current && lastCandleRef.current) {
            const lc = lastCandleRef.current;
            const updated: Candle = {
              ...lc,
              high: Math.max(lc.high, mid),
              low: Math.min(lc.low, mid),
              close: mid,
            };
            try {
              candleSeriesRef.current.update?.({
                time: updated.time as any,
                open: updated.open,
                high: updated.high,
                low: updated.low,
                close: updated.close,
              });
              const ts = chartApiRef.current?.timeScale?.();
              ts?.scrollToRealTime?.();
              lastCandleRef.current = updated;
            } catch {}
          }
        }
      } else if (mid > 0) {
        setCandlesCacheLabel('SESSION');
        setChartNote(ticksData.session ? 'Session running — building candles…' : 'Waiting for session…');
      }

      if (serverSeq > rareSeqRef.current) {
        rareSeqRef.current = serverSeq;
      }

      const tradesRes = await fetch('/api/demo-fx/trades?status=all', { headers, cache: 'no-store' });
      const tradesJson = await tradesRes.json().catch(() => null);
      const rawTrades: DemoFxTrade[] = Array.isArray(tradesJson?.trades) ? tradesJson.trades : [];

      const livePrices: Record<string, { bid: number; ask: number; mid: number }> = {};
      if (currentPair && (ask > 0 || bid > 0)) {
        livePrices[currentPair.id] = { bid, ask, mid };
      }
      for (const p of Object.values(rareUiSymbolToPair)) {
        if (p && p.id && !livePrices[p.id]) {
          livePrices[p.id] = {
            bid: Number(p.current_bid) || 0,
            ask: Number(p.current_ask) || 0,
            mid: (Number(p.current_bid) + Number(p.current_ask)) / 2,
          };
        }
      }

      const liveTrades = rawTrades.map((t) => {
        if (t.status !== 'open') return t;

        const prices = livePrices[t.pair_id];
        const displayPrice =
          prices?.ask && prices.ask > 0 ? prices.ask : prices?.bid && prices.bid > 0 ? prices.bid : 0;

        if (!(displayPrice > 0)) return t;

        const dir = Number(t.direction);
        const inv = Number(t.investment) || 0;
        const mult = Number(t.multiplier) || 1;
        const entry = Number(t.entry_price) || 0;

        let pnl = entry > 0 ? dir * inv * mult * ((displayPrice - entry) / entry) : 0;
        if (pnl < -inv) pnl = -inv;

        return {
          ...t,
          current_price: Number(displayPrice.toFixed(6)),
          floating_pnl: Number(pnl.toFixed(4)),
        };
      });

      setRareTrades(liveTrades);
    } catch (e: any) {
      setError(e?.message || 'Failed to load rare FX data');
    }
  };


  const zoomChartToLatestWindow = (candles: Candle[]) => {
    const chart = chartApiRef.current;
    const timeScale = chart?.timeScale?.();
    if (!timeScale || !candles.length) return;

    const key = `${assetRef.current}:${tfRef.current}`;
    if (initialChartViewKeyRef.current === key) return;

    const firstTs = normalizeEpochSeconds(candles[0]?.time);
    const lastTs = normalizeEpochSeconds(candles[candles.length - 1]?.time);
    if (!(firstTs > 0) || !(lastTs > 0)) return;

    const tfSec = Math.max(1, Math.floor(tfToMs(tfRef.current) / 1000));
    const visibleWindowSec = Math.max(DEFAULT_OPEN_VIEW_SECONDS, tfSec * DEFAULT_OPEN_VIEW_BARS);
    const from = Math.max(firstTs, lastTs - visibleWindowSec);

    initialChartViewKeyRef.current = key;

    requestAnimationFrame(() => {
      try {
        timeScale.setVisibleRange({
          from: from as any,
          to: lastTs as any,
        });
        timeScale.scrollToRealTime?.();
      } catch {
        initialChartViewKeyRef.current = '';
      }
    });
  };

  const initChartIfNeeded = async () => {
    const el = chartWrapRef.current;
    if (!el) return;
    if (chartApiRef.current && candleSeriesRef.current) return;

    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) throw new Error(`Chart container has no size (w=${w}, h=${h}).`);

    const mod: any = await import('lightweight-charts');
    const createChart = mod?.createChart ?? mod?.default?.createChart;
    const CandlestickSeries = mod?.CandlestickSeries ?? mod?.default?.CandlestickSeries;
    const CrosshairMode = mod?.CrosshairMode ?? mod?.default?.CrosshairMode;

    if (!createChart) throw new Error('lightweight-charts: createChart export not found.');

    try {
      el.innerHTML = '';
    } catch {}

    const chart = createChart(el, {
      width: w,
      height: h,
      layout: { background: { color: 'transparent' }, textColor: 'rgba(255,255,255,0.88)' },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.06)' },
        horzLines: { color: 'rgba(255,255,255,0.06)' },
      },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.14)' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.14)',
        timeVisible: true,
        secondsVisible: false,
        lockVisibleTimeRangeOnResize: true,
        barSpacing: 14,
        minBarSpacing: 6,
        rightOffset: 8,
      },
      crosshair: { mode: CrosshairMode?.Normal ?? 0 },
    });

    let series: any = null;

    if (typeof chart.addCandlestickSeries === 'function') {
      series = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#f43f5e',
        borderUpColor: '#22c55e',
        borderDownColor: '#f43f5e',
        wickUpColor: '#22c55e',
        wickDownColor: '#f43f5e',
      });
    } else if (typeof chart.addSeries === 'function' && CandlestickSeries) {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#22c55e',
        downColor: '#f43f5e',
        borderUpColor: '#22c55e',
        borderDownColor: '#f43f5e',
        wickUpColor: '#22c55e',
        wickDownColor: '#f43f5e',
      });
    } else {
      throw new Error(
        'lightweight-charts: candlestick series API not found (v5 expects addSeries + CandlestickSeries).'
      );
    }

    chartApiRef.current = chart;
    candleSeriesRef.current = series;

    try {
      const ro = new ResizeObserver(() => {
        const ww = el.clientWidth;
        const hh = el.clientHeight;
        if (!ww || !hh) return;
        try {
          chart.applyOptions({ width: ww, height: hh });
        } catch {}
      });
      ro.observe(el);
      resizeObsRef.current = ro;
    } catch {}

    initialChartViewKeyRef.current = '';
  };

  const setChartData = (candles: Candle[]) => {
    if (!candleSeriesRef.current) {
      setError('Chart series not ready (candlestick series is null).');
      return;
    }

    const byTime = new Map<number, Candle>();
    for (const c of candles) {
      if (c.time > 0 && c.open > 0) byTime.set(c.time, c);
    }
    const deduped = Array.from(byTime.values()).sort((a, b) => a.time - b.time);

    if (deduped.length === 0) return;

    const data = deduped.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    try {
      candleSeriesRef.current.setData(data);
      zoomChartToLatestWindow(deduped);
    } catch (e: any) {
      console.error('[fx-chart] setData failed:', e);
      setError(e?.message || 'Failed to draw candles');
    }

    lastCandleRef.current = deduped.length ? deduped[deduped.length - 1] : null;
  };

  const applyLiveTickToChart = (price: number, nowMs: number) => {
    if (rareModeRef.current || isRareUiPair(assetRef.current)) return;

    const series = candleSeriesRef.current;
    if (!series || !Number.isFinite(price) || price <= 0) return;

    const intervalMs = tfToMs(tfRef.current);
    const bucketStartMs = Math.floor(nowMs / intervalMs) * intervalMs;
    const bucketTimeSec = Math.floor(bucketStartMs / 1000);

    const prev = lastCandleRef.current;
    if (!prev || prev.time <= 0) return;

    if (prev.time === bucketTimeSec) {
      const next: Candle = {
        time: prev.time,
        open: prev.open,
        high: Math.max(prev.high, price),
        low: Math.min(prev.low, price),
        close: price,
      };
      lastCandleRef.current = next;
      try {
        series.update?.({
          time: next.time as any,
          open: next.open,
          high: next.high,
          low: next.low,
          close: next.close,
        });
        const ts = chartApiRef.current?.timeScale?.();
        ts?.scrollToRealTime?.();
      } catch {}
      return;
    }

    if (bucketTimeSec > prev.time) {
      const next: Candle = {
        time: bucketTimeSec,
        open: prev.close,
        high: Math.max(prev.close, price),
        low: Math.min(prev.close, price),
        close: price,
      };
      lastCandleRef.current = next;
      try {
        series.update?.({
          time: next.time as any,
          open: next.open,
          high: next.high,
          low: next.low,
          close: next.close,
        });
        const ts = chartApiRef.current?.timeScale?.();
        ts?.scrollToRealTime?.();
      } catch {}
    }
  };

  const setLivePriceFast = (pair: string, px: number) => {
    const currentAsset = assetRef.current;

    if (rareModeRef.current || isRareUiPair(currentAsset) || isRareUiPair(pair)) return;
    if (pair !== currentAsset) return;
    if (!Number.isFinite(px) || px <= 0) return;

    startTransition(() => {
      setLastClose(px);
      if (!marketEditingRef.current) setMarketPrice(px.toFixed(5));

      const hasActive = tradesRef.current.some((t) => t.status === 'active' && t.asset === pair);
      if (!hasActive) return;

      setNormalTrades((prev) =>
        prev.map((t) => (t.status === 'active' && t.asset === pair ? { ...t, currentPrice: px } : t))
      );
    });
  };

  const loadChart = async (opts?: { fresh?: boolean }) => {
    if (unmountedRef.current || rareModeRef.current || isRareUiPair(assetRef.current)) return;

    setChartNote(null);

    const el = chartWrapRef.current;
    if (!el) return;

    if (chartInFlightRef.current) return;
    chartInFlightRef.current = true;

    try {
      chartAbortRef.current?.abort();
    } catch {}
    const ac = new AbortController();
    chartAbortRef.current = ac;

    const curAsset = assetRef.current;
    const curTf = tfRef.current;
    const intervalMs = tfToMs(curTf);
    const count = minimum24hCandleCount(curTf);

    const cacheKey = candlesCacheKey(curAsset, curTf);
    const ticksKey = ticksCacheKey(curAsset);

    try {
      await initChartIfNeeded();
    } catch (e: any) {
      console.error('[fx-chart] init failed:', e);
      setError(e?.message || 'Chart init failed');
      chartInFlightRef.current = false;
      return;
    }

    if (
      rareModeRef.current ||
      isRareUiPair(assetRef.current) ||
      curAsset !== assetRef.current ||
      curTf !== tfRef.current
    ) {
      chartInFlightRef.current = false;
      return;
    }

    try {
      const cached = cacheGet<{ ts: number; candles: Candle[] }>(cacheKey);
      const now = Date.now();

      if (cached?.candles?.length) {
        setCandlesCacheLabel('LOCAL');
        setChartData(cached.candles);
        setChartNote('Showing saved chart history.');

        const lc = cached.candles[cached.candles.length - 1]?.close ?? null;
        if (lc && lc > 0) {
          setLivePriceFast(curAsset, lc);
          pushFxTick(curAsset, lc);
          void pushPriceToServer(curAsset, lc);
        }
      } else {
        const ticks = cacheGet<Tick[]>(ticksKey) || [];
        const built = buildCandlesFromTicksFx(ticks, intervalMs, count);
        if (built.length) {
          setCandlesCacheLabel('LOCAL_TICKS');
          setChartData(built);
          setChartNote('Rebuilt chart from saved live ticks.');

          const lc = built[built.length - 1]?.close ?? null;
          if (lc && lc > 0) {
            setLivePriceFast(curAsset, lc);
            void pushPriceToServer(curAsset, lc);
          }
        } else {
          setCandlesCacheLabel('SIM');
          const seed = clampNum(lastClose ?? marketPrice, 1.0);
          const synth = generateSyntheticCandlesFx(seed, intervalMs, count, `${curAsset}:${curTf}`);
          setChartData(synth);
          setChartNote('Market data unavailable — showing simulated chart.');

          const lc = synth[synth.length - 1]?.close ?? null;
          if (lc && lc > 0 && !marketEditingRef.current) setMarketPrice(lc.toFixed(5));
        }
      }

      const cached2 = cacheGet<{ ts: number; candles: Candle[] }>(cacheKey);
      const baseMs = TIMEFRAMES.find((x) => x.value === curTf)?.pollMs ?? 15000;
      const freshMs = Math.max(20_000, Math.min(10 * 60_000, baseMs * 4));
      const isFresh = !!cached2?.ts && now - cached2.ts < freshMs;

      if (isFresh && !opts?.fresh) {
        chartInFlightRef.current = false;
        return;
      }
    } catch {}

    try {
      const result = await fetchFxCandles(curAsset, curTf, count, ac.signal, !!opts?.fresh);
      if (ac.signal.aborted || unmountedRef.current) return;

      if (
        rareModeRef.current ||
        isRareUiPair(assetRef.current) ||
        curAsset !== assetRef.current ||
        curTf !== tfRef.current
      ) {
        return;
      }

      retryAfterMsRef.current = 0;
      setCandlesCacheLabel(result.cache || 'LIVE');

      const candles = result.candles;
      if (!candles.length) {
        setChartNote('No candles returned.');
        return;
      }

      cacheSet(cacheKey, { ts: Date.now(), candles });
      setChartData(candles);

      const lc = candles[candles.length - 1]?.close ?? null;
      if (lc != null && lc > 0) {
        setLivePriceFast(curAsset, lc);
        pushFxTick(curAsset, lc);
        void pushPriceToServer(curAsset, lc);
      }
    } catch (e: any) {
      if (e?.name === 'CandlesError' && typeof e?.retryAfterMs === 'number' && e.retryAfterMs > 0) {
        retryAfterMsRef.current = e.retryAfterMs;
        setChartNote(`Rate limited. Retrying in ${Math.ceil(e.retryAfterMs / 1000)}s…`);
      } else {
        setChartNote(e?.message || 'Failed to load chart');
      }
    } finally {
      chartInFlightRef.current = false;
    }
  };

  const wsRef = useRef<WebSocket | null>(null);
  const wsWantedInstrumentRef = useRef<string>('');
  const wsConnectedRef = useRef(false);
  const wsRetryTimerRef = useRef<number | null>(null);
  const wsBackoffRef = useRef<number>(450);

  const liveUiRafRef = useRef<number | null>(null);
  const liveLastUiMsRef = useRef<number>(0);
  const liveLastPxRef = useRef<number | null>(null);

  const clearWsRetry = () => {
    try {
      if (wsRetryTimerRef.current) window.clearTimeout(wsRetryTimerRef.current);
    } catch {}
    wsRetryTimerRef.current = null;
  };

  const closeWs = () => {
    clearWsRetry();
    try {
      wsRef.current?.close(1000, 'client_close');
    } catch {}
    wsRef.current = null;
    wsConnectedRef.current = false;
    setWsOn(false);
  };

  const wsSend = (obj: any) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(obj));
    } catch {}
  };

  const scheduleWsReconnect = (why?: string) => {
    if (unmountedRef.current || rareModeRef.current || isRareUiPair(assetRef.current)) return;
    clearWsRetry();

    const delay = Math.min(8000, wsBackoffRef.current + Math.floor(Math.random() * 350));
    wsBackoffRef.current = Math.min(8000, Math.floor(wsBackoffRef.current * 1.35));

    if (why) setWsNote(why);

    wsRetryTimerRef.current = window.setTimeout(() => {
      void connectWs();
    }, delay);
  };

  const subscribeInstrument = (instrument: string) => {
    if (!instrument) return;

    const prev = wsWantedInstrumentRef.current;
    wsWantedInstrumentRef.current = instrument;

    if (wsConnectedRef.current) {
      if (prev && prev !== instrument) wsSend({ action: 'unsubscribe', fx: [prev] });
      wsSend({ action: 'subscribe', fx: [instrument] });
    }
  };

  const connectWs = async () => {
    if (unmountedRef.current || rareModeRef.current || isRareUiPair(assetRef.current)) return;

    const url = getGatewayUrl();
    if (!url) {
      setWsOn(false);
      setWsNote('Missing gateway WS URL.');
      return;
    }

    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) return;

    try {
      setWsNote('Connecting…');
      console.log('[market-gw] connecting →', url);

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (rareModeRef.current || isRareUiPair(assetRef.current)) {
          try {
            ws.close(1000, 'rare_mode');
          } catch {}
          return;
        }

        wsConnectedRef.current = true;
        wsBackoffRef.current = 450;
        setWsOn(true);
        setWsNote(null);
        console.log('[market-gw] OPEN ✅');

        const inst = wsWantedInstrumentRef.current;
        if (inst) wsSend({ action: 'subscribe', fx: [inst] });
      };

      ws.onmessage = (ev) => {
        let msg: GatewayMsg | null = null;
        try {
          msg = JSON.parse(String(ev.data || ''));
        } catch {
          msg = null;
        }
        if (!msg) return;

        if ((msg as any)?.type === 'hello') {
          console.log('[market-gw] HELLO', msg);
        }

        if ((msg as any)?.type === 'fx_tick') {
          const m = msg as any;
          const inst = String(m.instrument || '').toUpperCase();
          const px = Number(m.mid);
          if (!inst || !Number.isFinite(px) || px <= 0) return;

          const wanted = wsWantedInstrumentRef.current;
          if (wanted && inst !== wanted) return;

          const pair = assetRef.current;
          const currentAsset = assetRef.current;
          if (rareModeRef.current || isRareUiPair(currentAsset) || pair !== currentAsset) return;

          const nowMs = Date.now();

          pushFxTick(pair, px);
          applyLiveTickToChart(px, nowMs);

          liveLastPxRef.current = px;

          const doUi = () => {
            liveUiRafRef.current = null;

            if (rareModeRef.current || isRareUiPair(assetRef.current)) return;

            const p = liveLastPxRef.current;
            if (p == null) return;

            const now = Date.now();
            if (now - liveLastUiMsRef.current < 140) return;
            liveLastUiMsRef.current = now;

            setLivePriceFast(pair, p);
            void pushPriceToServer(pair, p);
          };

          if (liveUiRafRef.current == null) {
            liveUiRafRef.current = window.requestAnimationFrame(doUi);
          }
        }
      };

      ws.onerror = (e) => {
        console.log('[market-gw] ERROR ❌', e);
        setWsOn(false);
        setWsNote('WS error (likely cold start / network). Retrying…');
        scheduleWsReconnect('WS error. Retrying…');
      };

      ws.onclose = (e) => {
        console.log('[market-gw] CLOSE', e.code, e.reason);
        wsConnectedRef.current = false;
        wsRef.current = null;
        setWsOn(false);

        if (rareModeRef.current || isRareUiPair(assetRef.current) || unmountedRef.current) return;

        const msg = `WS closed (${e.code}${e.reason ? `: ${e.reason}` : ''}). Retrying…`;
        setWsNote(msg);
        scheduleWsReconnect(msg);
      };
    } catch (err) {
      console.log('[market-gw] CONNECT FAIL', err);
      setWsOn(false);
      setWsNote('WS connect failed. Retrying…');
      scheduleWsReconnect('WS connect failed. Retrying…');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (rareMode) {
      closeWs();
      setWsOn(false);
      setWsNote(null);
      rareChartHashRef.current = '';
      rareSeqRef.current = 0;
      rareSessionIdRef.current = null;
      setChartNote(null);

      try {
        chartAbortRef.current?.abort();
      } catch {}

      try {
        if (liveUiRafRef.current != null) window.cancelAnimationFrame(liveUiRafRef.current);
      } catch {}
      liveUiRafRef.current = null;

      try {
        chartApiRef.current?.remove?.();
      } catch {}
      chartApiRef.current = null;
      candleSeriesRef.current = null;
      lastCandleRef.current = null;
      initialChartViewKeyRef.current = '';

      return;
    }

    rareChartHashRef.current = '';
    rareSeqRef.current = 0;
    rareSessionIdRef.current = null;

    try {
      chartAbortRef.current?.abort();
    } catch {}

    try {
      chartApiRef.current?.remove?.();
    } catch {}
    chartApiRef.current = null;
    candleSeriesRef.current = null;
    lastCandleRef.current = null;
    initialChartViewKeyRef.current = '';

    const inst = displayToOandaInstrument(asset);
    subscribeInstrument(inst);
    void connectWs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, rareMode]);

  useEffect(() => {
    unmountedRef.current = false;

    void loadNormalTrades();
    void refreshUser().catch(() => {});
    if (!rareMode) void connectWs();

    return () => {
      unmountedRef.current = true;

      try {
        if (pollTimeoutRef.current) window.clearTimeout(pollTimeoutRef.current);
      } catch {}
      pollTimeoutRef.current = null;

      try {
        chartAbortRef.current?.abort();
      } catch {}

      try {
        resizeObsRef.current?.disconnect?.();
      } catch {}

      try {
        chartApiRef.current?.remove?.();
      } catch {}
      chartApiRef.current = null;
      candleSeriesRef.current = null;
      initialChartViewKeyRef.current = '';

      try {
        if (liveUiRafRef.current != null) window.cancelAnimationFrame(liveUiRafRef.current);
      } catch {}
      liveUiRafRef.current = null;

      closeWs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (rareMode) return;

    const baseMs = TIMEFRAMES.find((x) => x.value === tf)?.pollMs ?? 15000;

    const clear = () => {
      try {
        if (pollTimeoutRef.current) window.clearTimeout(pollTimeoutRef.current);
      } catch {}
      pollTimeoutRef.current = null;
    };

    let cancelled = false;
    const jitter = () => Math.floor(Math.random() * 700);

    const tick = async () => {
      if (cancelled || unmountedRef.current) return;

      if (typeof document !== 'undefined' && document.hidden) {
        clear();
        pollTimeoutRef.current = window.setTimeout(tick, Math.max(25000, baseMs));
        return;
      }

      await loadChart();

      const retryMs = retryAfterMsRef.current;
      const next = (retryMs > 0 ? retryMs : baseMs) + jitter();

      clear();
      pollTimeoutRef.current = window.setTimeout(tick, next);
    };

    const onVis = () => {
      if (cancelled || unmountedRef.current) return;

      if (!document.hidden) {
        retryAfterMsRef.current = 0;
        void loadChart();
        clear();
        pollTimeoutRef.current = window.setTimeout(tick, baseMs + jitter());
      } else {
        clear();
      }
    };

    void loadChart();
    clear();
    pollTimeoutRef.current = window.setTimeout(tick, baseMs + jitter());

    try {
      document.addEventListener('visibilitychange', onVis);
    } catch {}

    return () => {
      cancelled = true;
      clear();
      try {
        document.removeEventListener('visibilitychange', onVis);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, tf, rareMode]);

  useEffect(() => {
    if (!rareMode) return;

    let dead = false;
    let timer: number | null = null;

    const tick = async () => {
      if (dead) return;
      await loadRareMode();
      if (dead) return;
      timer = window.setTimeout(tick, 1000);
    };

    void loadRareMode();
    timer = window.setTimeout(tick, 1000);

    return () => {
      dead = true;
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rareMode, asset, tf]);

  const onRefresh = async () => {
    if (rareMode) {
      await loadRareMode();
      return;
    }

    await loadNormalTrades();
    await loadChart({ fresh: true });
    try {
      await refreshUser();
    } catch {}
    void connectWs();
  };

  const openTrade = async () => {
    if (rareMode) {
      setError(null);
      setLoading(true);

      try {
        if (!activeRarePair) throw new Error('Rare pair is not ready yet.');

        const token = await headerAuthToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const inv = clampNum(investment, 0);
        if (inv <= 0) throw new Error('Investment must be greater than 0');

        const body: any = {
          pair_id: activeRarePair.id,
          direction,
          investment: inv,
          multiplier,
        };

        if (stopLoss.trim()) body.stop_loss = clampNum(stopLoss, 0);
        if (takeProfit.trim()) body.take_profit = clampNum(takeProfit, 0);

        const res = await fetch('/api/demo-fx/trades', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          cache: 'no-store',
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Failed to open rare FX trade');

        await loadRareMode();
        try {
          await loadNormalTrades();
        } catch {}
        try {
          await refreshUser();
        } catch {}
      } catch (e: any) {
        setError(e?.message || 'Failed to open rare FX trade');
      } finally {
        setLoading(false);
      }
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const token = await headerAuthToken();
      if (!token) throw new Error('Missing API token. Please sign in again.');

      const inv = clampNum(investment, 0);
      const mp = clampNum(marketPrice, 0);
      const sl = stopLoss.trim() ? clampNum(stopLoss, 0) : undefined;
      const tp = takeProfit.trim() ? clampNum(takeProfit, 0) : undefined;

      if (!asset) throw new Error('Select an FX pair');
      if (inv <= 0) throw new Error('Investment must be greater than 0');
      if (mp <= 0) throw new Error('Market price must be greater than 0');
      if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 1000) {
        throw new Error('Leverage must be between 1 and 1000');
      }

      const idempotencyKey = makeIdempotencyKey();

      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          asset,
          assetType: 'forex',
          direction,
          investment: inv,
          multiplier,
          marketPrice: mp,
          stopLoss: sl,
          takeProfit: tp,
          idempotencyKey,
        }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }

      if (!res.ok || !json?.success) throw new Error(json?.error || `Trade open failed (${res.status})`);

      setBalance(clampNum(json?.balance ?? json?.balance_available ?? balance));
      await loadNormalTrades();

      const lc = liveLastPxRef.current ?? lastClose;
      if (lc != null && lc > 0) {
        pushFxTick(asset, lc);
        void pushPriceToServer(asset, lc);
      }

      try {
        await refreshUser();
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to open trade');
    } finally {
      setLoading(false);
    }
  };

  const closeTrade = async (t: FxUiTrade) => {
    if (rareMode) {
      setError(null);
      setActionLoadingId(t.id);

      try {
        const token = await headerAuthToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch('/api/demo-fx/trades', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ trade_id: t.id }),
          cache: 'no-store',
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Failed to close rare FX trade');

        setExitDraft((prev) => {
          const next = { ...prev };
          delete next[t.id];
          return next;
        });

        await loadRareMode();
        try {
          await loadNormalTrades();
        } catch {}
        try {
          await refreshUser();
        } catch {}
      } catch (e: any) {
        setError(e?.message || 'Failed to close rare FX trade');
      } finally {
        setActionLoadingId(null);
      }
      return;
    }

    setError(null);
    setActionLoadingId(t.id);

    try {
      const token = await headerAuthToken();
      if (!token) throw new Error('Missing API token. Please sign in again.');

      const draft = (exitDraft[t.id] ?? '').trim();
      const exit = draft ? clampNum(draft, 0) : clampNum(t.currentPrice, 0);
      if (exit <= 0) throw new Error('Exit price must be greater than 0');

      const res = await fetch('/api/trades', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close',
          tradeId: t.id,
          exitPrice: exit,
          closeReason: 'manual',
        }),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }

      if (!res.ok || !json?.success) throw new Error(json?.error || `Trade close failed (${res.status})`);

      setBalance(clampNum(json?.balance ?? json?.balance_available ?? balance));

      setExitDraft((prev) => {
        const next = { ...prev };
        delete next[t.id];
        return next;
      });

      await loadNormalTrades();

      try {
        await refreshUser();
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Failed to close trade');
    } finally {
      setActionLoadingId(null);
    }
  };

  const invNum = clampNum(investment, 0);
  const notionalPreview = invNum > 0 && multiplier > 0 ? invNum * multiplier : 0;
  const tfLabel = TIMEFRAMES.find((x) => x.value === tf)?.label ?? tf;

  const livePairLabel = rareMode ? activeRarePairUi?.symbol || asset : asset;

  const rareSelectedDecimals = activeRarePair ? getPairDecimalsFromPip(activeRarePair.pip_size) : 4;
  const currentDisplayDp = rareMode ? rareSelectedDecimals : 5;

  const activePnl = sortedTrades.filter(t => t.status === 'active').reduce((s, t) => s + t.pnl, 0);
  const activeCount = sortedTrades.filter(t => t.status === 'active').length;

  return (
    <div className="font-app h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)] flex flex-col bg-[#0A1526] text-white overflow-hidden">

      {/* ═══════ TOP BAR — OlympTrade style ═══════ */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-5 py-2.5 border-b border-white/10 bg-gradient-to-b from-[#13243D] to-[#0F1D33]">
        <div className="flex items-center gap-3 min-w-0">
          {/* Pair selector */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FA56B]/70" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FA56B]" />
            </span>
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="bg-transparent border-none outline-none text-sm sm:text-base font-bold truncate cursor-pointer appearance-none pr-5"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 center' }}
            >
              <optgroup label="Major Pairs">
                {FX_PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
              </optgroup>
              <optgroup label="Exotic Pairs">
                {RARE_PAIR_PRESETS.map((p) => <option key={p.symbol} value={p.symbol}>{p.symbol}</option>)}
              </optgroup>
            </select>
          </div>

          {/* Live price */}
          <div className="text-sm sm:text-base font-mono tabular-nums text-[#22D3EE]">
            {lastClose != null ? lastClose.toFixed(currentDisplayDp) : '—'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Balance */}
          <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <span className="text-xs sm:text-sm font-semibold tabular-nums">${fmt(balance, 2)}</span>
          </div>

          <button onClick={onRefresh} disabled={loading} type="button"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition disabled:opacity-50"
            style={{ WebkitTapHighlightColor: 'transparent' }}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex-shrink-0 px-3 py-2 bg-[#D9743C]/10 border-b border-[#D9743C]/20 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#D9743C] flex-shrink-0" />
          <span className="text-xs text-[#D9743C] truncate">{error}</span>
        </div>
      )}

      {/* ═══════ MAIN AREA — Desktop: chart + panel side-by-side, Mobile: chart only ═══════ */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* CHART AREA */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Timeframe strip */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#0C1828]">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {TIMEFRAMES.map((t) => (
                <button key={t.value} type="button" onClick={() => setTf(t.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex-shrink-0 ${
                    tf === t.value ? 'bg-[#22D3EE] text-[#0A1526]' : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-white/40 ml-2 flex-shrink-0">
              {wsOn && <span className="h-1.5 w-1.5 rounded-full bg-[#2FA56B]" />}
              <span>{wsOn ? 'Live' : 'Offline'}</span>
            </div>
          </div>

          {/* Chart canvas */}
          <div className="flex-1 relative min-h-0">
            <div ref={chartWrapRef} className="absolute inset-0" />
            {/* Chart note overlay */}
            {chartNote && (
              <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-[10px] text-white/50 backdrop-blur-sm">
                {chartNote}
              </div>
            )}
          </div>
        </div>

        {/* DESKTOP TRADE PANEL — hidden on mobile */}
        <div className="hidden lg:flex flex-col w-80 xl:w-96 border-l border-white/10 bg-[#0F1D33] overflow-y-auto">

          {/* Direction buttons */}
          <div className="p-3 border-b border-white/10">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setDirection('buy')}
                className={`py-3 rounded-xl font-bold text-sm transition ${
                  direction === 'buy' ? 'bg-[#2FA56B] text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`} style={{ WebkitTapHighlightColor: 'transparent' }}>
                <span className="inline-flex items-center gap-1.5"><TrendingUp className="h-4 w-4" /> Buy</span>
              </button>
              <button type="button" onClick={() => setDirection('sell')}
                className={`py-3 rounded-xl font-bold text-sm transition ${
                  direction === 'sell' ? 'bg-rose-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`} style={{ WebkitTapHighlightColor: 'transparent' }}>
                <span className="inline-flex items-center gap-1.5"><TrendingDown className="h-4 w-4" /> Sell</span>
              </button>
            </div>
          </div>

          {/* Trade form */}
          <div className="p-3 space-y-3 flex-1">
            <div>
              <label className="text-[11px] text-white/50 uppercase tracking-wider">Investment</label>
              <div className="mt-1 flex items-center gap-1">
                <button type="button" onClick={() => setInvestment(String(Math.max(10, clampNum(investment, 0) - 10)))}
                  className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 text-lg">−</button>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                  <input value={investment} onChange={(e) => setInvestment(e.target.value)} inputMode="decimal"
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-black/30 border border-white/10 outline-none text-center font-mono" />
                </div>
                <button type="button" onClick={() => setInvestment(String(clampNum(investment, 0) + 10))}
                  className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 text-lg">+</button>
              </div>
              <div className="flex gap-1 mt-1.5">
                {[25, 50, 100, 250, 500].map((v) => (
                  <button key={v} type="button" onClick={() => setInvestment(String(v))}
                    className={`flex-1 py-1 text-[10px] rounded-lg transition ${
                      investment === String(v) ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30' : 'bg-white/5 text-white/40 hover:bg-white/10'
                    }`}>${v}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] text-white/50 uppercase tracking-wider">Leverage</label>
              <select value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))}
                className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none font-mono">
                {MULTIPLIERS.map((m) => <option key={m} value={m}>x{m}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-white/50 uppercase tracking-wider">Market price</label>
              <input value={marketPrice} onChange={(e) => setMarketPrice(e.target.value)}
                onFocus={() => { marketEditingRef.current = true; }} onBlur={() => { marketEditingRef.current = false; }}
                readOnly={rareMode} inputMode="decimal"
                className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none font-mono text-sm" placeholder="1.00000" />
            </div>

            {/* SL/TP */}
            <div>
              <label className="text-[11px] text-white/50 uppercase tracking-wider">SL / TP</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} inputMode="decimal"
                    className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none text-sm focus:border-rose-500/40 transition" placeholder="Stop Loss" />
                  <div className="flex gap-0.5 mt-1">
                    {[10, 25, 50, 100].map((pips) => (
                      <button key={`sl-${pips}`} type="button" onClick={() => {
                        const mp = clampNum(marketPrice, 0);
                        if (mp > 0) { const pipVal = mp < 10 ? 0.0001 : 0.01; const slPrice = direction === 'buy' ? mp - pips * pipVal : mp + pips * pipVal; setStopLoss(slPrice.toFixed(mp < 10 ? 5 : 3)); }
                      }} className="flex-1 py-0.5 text-[9px] rounded bg-rose-500/10 text-rose-400/70 hover:bg-rose-500/20">{pips}p</button>
                    ))}
                  </div>
                </div>
                <div>
                  <input value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} inputMode="decimal"
                    className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none text-sm focus:border-[#2FA56B]/40 transition" placeholder="Take Profit" />
                  <div className="flex gap-0.5 mt-1">
                    {[10, 25, 50, 100].map((pips) => (
                      <button key={`tp-${pips}`} type="button" onClick={() => {
                        const mp = clampNum(marketPrice, 0);
                        if (mp > 0) { const pipVal = mp < 10 ? 0.0001 : 0.01; const tpPrice = direction === 'buy' ? mp + pips * pipVal : mp - pips * pipVal; setTakeProfit(tpPrice.toFixed(mp < 10 ? 5 : 3)); }
                      }} className="flex-1 py-0.5 text-[9px] rounded bg-[#2FA56B]/10 text-[#2FA56B]/70 hover:bg-[#2FA56B]/20">{pips}p</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-white/5 p-3 space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-white/50">Notional</span><span className="font-mono">${fmt(notionalPreview, 2)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-white/50">Pair</span><span>{livePairLabel}</span></div>
            </div>

            <button onClick={openTrade} disabled={loading || !canUseSupabase} type="button"
              className={`w-full py-3.5 rounded-xl font-bold text-base transition ${
                direction === 'buy' ? 'bg-[#2FA56B] hover:bg-[#2FA56B] text-white' : 'bg-rose-500 hover:bg-rose-600 text-white'
              } disabled:opacity-50`}>
              {direction === 'buy' ? '↑ Open Buy' : '↓ Open Sell'}
            </button>
          </div>

          {/* Desktop trades list */}
          <div className="border-t border-white/10">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex gap-2">
                <button type="button" onClick={() => { setMode('active'); void (rareMode ? loadRareMode() : loadNormalTrades()); }}
                  className={`text-xs font-medium px-2 py-1 rounded-lg ${mode === 'active' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}>
                  Active ({activeCount})
                </button>
                <button type="button" onClick={() => { setMode('history'); void (rareMode ? loadRareMode() : loadNormalTrades()); }}
                  className={`text-xs font-medium px-2 py-1 rounded-lg ${mode === 'history' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}>
                  History
                </button>
              </div>
              {activeCount > 0 && (
                <span className={`text-xs font-mono ${activePnl >= 0 ? 'text-[#2FA56B]' : 'text-rose-400'}`}>
                  {activePnl >= 0 ? '+' : ''}${fmt(activePnl, 2)}
                </span>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {sortedTrades.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-white/40">{loading ? 'Loading…' : 'No trades yet'}</div>
              ) : sortedTrades.map((t) => (
                <div key={t.id} className="px-3 py-2 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.direction === 'buy' ? 'bg-[#2FA56B]/20 text-[#2FA56B]' : 'bg-rose-500/20 text-rose-400'}`}>
                        {t.direction.toUpperCase()}
                      </span>
                      <span className="text-xs font-medium">{t.asset}</span>
                      <span className="text-[10px] text-white/40">x{fmt(t.multiplier, 0)}</span>
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">${fmt(t.investment, 2)} · {fmt(t.entryPrice || 0, currentDisplayDp)}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-xs font-bold ${t.pnl >= 0 ? 'text-[#2FA56B]' : 'text-rose-400'}`}>
                      {t.pnl >= 0 ? '+' : ''}${fmt(t.pnl, 2)}
                    </div>
                    {t.status === 'active' && (
                      <button type="button" onClick={() => closeTrade(t)} disabled={actionLoadingId === t.id}
                        className="mt-1 inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-gradient-to-r from-electric to-cyan text-black text-[10px] font-bold tracking-wide shadow-glow-electric hover:brightness-110 active:scale-[0.97] disabled:opacity-50 transition">
                        {actionLoadingId === t.id ? '…' : 'CLOSE'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ MOBILE BOTTOM CONTROLS — OlympTrade-inspired ═══════ */}
      <div className="lg:hidden flex-shrink-0 border-t border-white/10 bg-[#0F1D33]"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

        {/* Active P&L strip */}
        {activeCount > 0 && (
          <button type="button" onClick={() => setShowMobileTrades(!showMobileTrades)}
            className="w-full flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5 active:bg-white/10"
            style={{ WebkitTapHighlightColor: 'transparent' }}>
            <span className="text-xs text-white/60">Active Trades ({activeCount})</span>
            <span className={`text-xs font-bold ${activePnl >= 0 ? 'text-[#2FA56B]' : 'text-rose-400'}`}>
              P&amp;L: {activePnl >= 0 ? '+' : ''}${fmt(activePnl, 2)}
            </span>
          </button>
        )}

        {/* Mobile trades drawer */}
        {showMobileTrades && (
          <div className="max-h-40 overflow-y-auto bg-[#0C1828] border-b border-white/10">
            {sortedTrades.filter(t => t.status === 'active').map((t) => (
              <div key={t.id} className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.direction === 'buy' ? 'bg-[#2FA56B]/20 text-[#2FA56B]' : 'bg-rose-500/20 text-rose-400'}`}>
                      {t.direction.toUpperCase()}
                    </span>
                    <span className="text-xs font-medium">{t.asset}</span>
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">${fmt(t.investment, 2)} · x{fmt(t.multiplier, 0)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold ${t.pnl >= 0 ? 'text-[#2FA56B]' : 'text-rose-400'}`}>
                    {t.pnl >= 0 ? '+' : ''}${fmt(t.pnl, 2)}
                  </span>
                  <button type="button" onClick={() => closeTrade(t)} disabled={actionLoadingId === t.id}
                    className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-medium active:bg-white/20 disabled:opacity-50"
                    style={{ WebkitTapHighlightColor: 'transparent' }}>
                    {actionLoadingId === t.id ? '...' : 'Close'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expandable trade form */}
        {showMobilePanel && (
          <div className="px-4 py-3 space-y-3 border-b border-white/10 bg-[#0C1828] max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 uppercase tracking-wider">Trade Setup</span>
              <button type="button" onClick={() => setShowMobilePanel(false)} className="text-white/40 hover:text-white p-1">
                <span className="text-lg">×</span>
              </button>
            </div>

            {/* Amount with +/- */}
            <div>
              <label className="text-[11px] text-white/50">Investment</label>
              <div className="mt-1 flex items-center gap-1">
                <button type="button" onClick={() => setInvestment(String(Math.max(10, clampNum(investment, 0) - 10)))}
                  className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 text-lg font-bold"
                  style={{ WebkitTapHighlightColor: 'transparent' }}>−</button>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <input value={investment} onChange={(e) => setInvestment(e.target.value)} inputMode="decimal"
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-black/30 border border-white/10 outline-none text-center text-lg font-bold" />
                </div>
                <button type="button" onClick={() => setInvestment(String(clampNum(investment, 0) + 10))}
                  className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 text-lg font-bold"
                  style={{ WebkitTapHighlightColor: 'transparent' }}>+</button>
              </div>
              <div className="flex gap-1 mt-1.5">
                {[25, 50, 100, 250, 500].map((v) => (
                  <button key={v} type="button" onClick={() => setInvestment(String(v))}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${
                      investment === String(v) ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30' : 'bg-white/5 text-white/50 active:bg-white/10'
                    }`} style={{ WebkitTapHighlightColor: 'transparent' }}>${v}</button>
                ))}
              </div>
            </div>

            {/* Leverage */}
            <div>
              <label className="text-[11px] text-white/50">Leverage</label>
              <div className="flex gap-1 mt-1">
                {MULTIPLIERS.map((m) => (
                  <button key={m} type="button" onClick={() => setMultiplier(m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                      multiplier === m ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30' : 'bg-white/5 text-white/50 active:bg-white/10'
                    }`} style={{ WebkitTapHighlightColor: 'transparent' }}>x{m}</button>
                ))}
              </div>
            </div>

            {/* SL/TP compact */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-rose-400/70">Stop Loss</label>
                <input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} inputMode="decimal"
                  className="mt-0.5 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none text-sm" placeholder="optional" />
                <div className="flex gap-0.5 mt-1">
                  {[20, 50, 100].map((pips) => (
                    <button key={`msl-${pips}`} type="button" onClick={() => {
                      const mp = clampNum(marketPrice, 0);
                      if (mp > 0) { const pipVal = mp < 10 ? 0.0001 : 0.01; const slPrice = direction === 'buy' ? mp - pips * pipVal : mp + pips * pipVal; setStopLoss(slPrice.toFixed(mp < 10 ? 5 : 3)); }
                    }} className="flex-1 py-0.5 text-[9px] rounded bg-rose-500/10 text-rose-400/60">{pips}p</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[#2FA56B]/70">Take Profit</label>
                <input value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} inputMode="decimal"
                  className="mt-0.5 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 outline-none text-sm" placeholder="optional" />
                <div className="flex gap-0.5 mt-1">
                  {[20, 50, 100].map((pips) => (
                    <button key={`mtp-${pips}`} type="button" onClick={() => {
                      const mp = clampNum(marketPrice, 0);
                      if (mp > 0) { const pipVal = mp < 10 ? 0.0001 : 0.01; const tpPrice = direction === 'buy' ? mp + pips * pipVal : mp - pips * pipVal; setTakeProfit(tpPrice.toFixed(mp < 10 ? 5 : 3)); }
                    }} className="flex-1 py-0.5 text-[9px] rounded bg-[#2FA56B]/10 text-[#2FA56B]/60">{pips}p</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notional summary */}
            <div className="flex justify-between text-xs px-1">
              <span className="text-white/40">Notional</span>
              <span className="font-mono">${fmt(notionalPreview, 2)}</span>
            </div>
          </div>
        )}

        {/* Main mobile trade bar — always visible */}
        <div className="px-3 py-3 flex items-center gap-2">
          {/* Settings toggle */}
          <button type="button" onClick={() => setShowMobilePanel(!showMobilePanel)}
            className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 flex-shrink-0"
            style={{ WebkitTapHighlightColor: 'transparent' }}>
            <CandlestickChart className="h-5 w-5 text-white/70" />
          </button>

          {/* Amount quick display */}
          <div className="flex-shrink-0 text-center px-2">
            <div className="text-[10px] text-white/40">Margin</div>
            <div className="text-sm font-bold">${investment}</div>
            <div className="text-[10px] text-white/40">x{multiplier}</div>
          </div>

          {/* BUY / SELL buttons — big OlympTrade style */}
          <button type="button"
            onClick={() => { setDirection('sell'); openTrade(); }}
            disabled={loading || !canUseSupabase}
            className="flex-1 h-12 rounded-xl bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 active:bg-rose-600 disabled:opacity-50 transition"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
            Sell <TrendingDown className="h-4 w-4" />
          </button>

          <button type="button"
            onClick={() => { setDirection('buy'); openTrade(); }}
            disabled={loading || !canUseSupabase}
            className="flex-1 h-12 rounded-xl bg-[#2FA56B] text-white font-bold text-sm flex items-center justify-center gap-1.5 active:bg-[#2FA56B] disabled:opacity-50 transition"
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>
            Buy <TrendingUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
