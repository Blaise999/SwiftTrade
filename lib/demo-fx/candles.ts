/**
 * USER DEMO FX CANDLES API
 * GET /api/demo-fx/candles?pair_id=X&tf=1m&limit=1440
 *
 * What this fixes:
 * - returns the MOST RECENT candles, not the oldest
 * - supports bigger limits for 24h chart history
 * - keeps continuous history across session + background candles
 * - falls back to tick aggregation when candle rows are sparse/stale
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  buildCandlesFromTickRows,
  ensurePairAutopilotFresh,
  resolvePairRuntimeState,
  tfToSeconds,
  toNum,
  type Candle,
  type RuntimePairRow,
  type TF,
} from '@/lib/demo-fx/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LIMIT = Math.max(
  500,
  parseInt(process.env.DEMO_FX_CANDLES_MAX_LIMIT || '2000', 10) || 2000
);
const MIN_LIMIT = 10;

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function normalizeTf(raw: string | null): TF {
  const tf = String(raw || '1m').trim();
  if (tf.toLowerCase() === '1d') return '1D';

  switch (tf) {
    case '1m':
    case '5m':
    case '15m':
    case '1h':
    case '4h':
    case '1D':
      return tf;
    default:
      return '1m';
  }
}

function sourceTfFor(tf: TF): TF {
  if (tf === '1m') return '1m';
  if (tf === '5m') return '5m';
  return '5m';
}

function aggregateCandles(candles: Candle[], targetTf: TF): Candle[] {
  if (!Array.isArray(candles) || !candles.length) return [];

  const bucketSec = tfToSeconds(targetTf);
  const byBucket = new Map<number, Candle>();

  const sorted = [...candles].sort((a, b) => a.time - b.time);

  for (const c of sorted) {
    if (!(c.time > 0) || !(c.open > 0) || !(c.high > 0) || !(c.low > 0) || !(c.close > 0)) {
      continue;
    }

    const bucket = Math.floor(c.time / bucketSec) * bucketSec;
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

async function fetchLatestCandlesForTf(
  supabase: ReturnType<typeof sb>,
  pairId: string,
  timeframe: TF,
  limit: number
): Promise<Candle[]> {
  const { data, error } = await supabase
    .from('demo_fx_candles')
    .select('bucket_start, open, high, low, close, tick_count')
    .eq('pair_id', pairId)
    .eq('timeframe', timeframe)
    .order('bucket_start', { ascending: false })
    .limit(limit * 2);

  if (error) {
    throw new Error(error.message);
  }

  const byTime = new Map<number, Candle>();

  for (const c of data || []) {
    const time = Math.floor(new Date(c.bucket_start).getTime() / 1000);
    const open = Number(c.open);
    const high = Number(c.high);
    const low = Number(c.low);
    const close = Number(c.close);
    const volume = Number(c.tick_count || 0);

    if (!(time > 0) || !(open > 0) || !(high > 0) || !(low > 0) || !(close > 0)) {
      continue;
    }

    if (!byTime.has(time)) {
      byTime.set(time, {
        time,
        open,
        high,
        low,
        close,
        volume: Number.isFinite(volume) ? volume : 0,
      });
    }
  }

  return Array.from(byTime.values())
    .sort((a, b) => a.time - b.time)
    .slice(-limit);
}

async function fetchTickCandles(
  supabase: ReturnType<typeof sb>,
  pairId: string,
  tf: TF,
  limit: number
): Promise<Candle[]> {
  const windowSec = tfToSeconds(tf) * Math.max(limit + 4, 120);
  const startIso = new Date(Date.now() - windowSec * 1000).toISOString();

  const { data, error } = await supabase
    .from('demo_fx_ticks')
    .select('mid, bid, ask, ts')
    .eq('pair_id', pairId)
    .gte('ts', startIso)
    .order('ts', { ascending: true })
    .limit(25000);

  if (error) throw new Error(error.message);

  return buildCandlesFromTickRows((data || []) as any[], tf, limit);
}

function lastTime(candles: Candle[]) {
  return candles.length ? candles[candles.length - 1].time : 0;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const pairId = String(searchParams.get('pair_id') || '').trim();
    const tf = normalizeTf(searchParams.get('tf'));
    const rawLimit = Number(searchParams.get('limit') || 500);
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 500, MIN_LIMIT), MAX_LIMIT);

    if (!pairId) {
      return NextResponse.json({ error: 'pair_id required' }, { status: 400 });
    }

    const supabase = sb();

    const { data: rawPair } = await supabase
      .from('demo_fx_pairs')
      .select('id, current_bid, current_ask, mode, active_session_id, seq, price_updated_at, pip_size, spread')
      .eq('id', pairId)
      .maybeSingle<RuntimePairRow>();

    if (rawPair) {
      const resolved = await resolvePairRuntimeState(supabase, rawPair);
      await ensurePairAutopilotFresh(supabase, resolved);
    }

    let candles = await fetchLatestCandlesForTf(supabase, pairId, tf, limit);
    let source_tf: string = tf;
    let aggregated = false;
    let from_ticks = false;

    if (!candles.length && tf !== '1m' && tf !== '5m') {
      const fallbackTf = sourceTfFor(tf);
      const sourceBucket = tfToSeconds(fallbackTf);
      const targetBucket = tfToSeconds(tf);
      const multiplier = Math.max(1, Math.ceil(targetBucket / sourceBucket));
      const sourceLimit = Math.min(MAX_LIMIT, Math.max(limit * multiplier + 4, limit));

      const baseCandles = await fetchLatestCandlesForTf(supabase, pairId, fallbackTf, sourceLimit);
      candles = aggregateCandles(baseCandles, tf).slice(-limit);
      source_tf = fallbackTf;
      aggregated = true;
    }

    const tickCandles = await fetchTickCandles(supabase, pairId, tf, limit);

    if (
      tickCandles.length &&
      (
        !candles.length ||
        tickCandles.length > candles.length ||
        lastTime(tickCandles) >= lastTime(candles)
      )
    ) {
      candles = tickCandles;
      source_tf = 'ticks';
      aggregated = tf !== '1m';
      from_ticks = true;
    }

    return NextResponse.json(
      {
        ok: true,
        pair_id: pairId,
        tf,
        limit,
        source_tf,
        aggregated,
        from_ticks,
        count: candles.length,
        candles,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}