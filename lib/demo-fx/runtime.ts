import type { SupabaseClient } from '@supabase/supabase-js';

export type TF = '1m' | '5m' | '15m' | '1h' | '4h' | '1D';

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type RuntimePairRow = {
  id: string;
  symbol?: string;
  current_bid: number | string | null;
  current_ask: number | string | null;
  mode?: string | null;
  active_session_id?: string | null;
  seq?: number | string | null;
  price_updated_at?: string | null;
  pip_size?: number | string | null;
  spread?: number | string | null;
};

const AUTO_TICK_STALE_MS = Math.max(
  8_000,
  parseInt(process.env.DEMO_FX_AUTO_TICK_STALE_MS || '10000', 10) || 10000
);

const AUTO_TICK_STEP_MS = Math.max(
  2_000,
  parseInt(process.env.DEMO_FX_AUTO_TICK_STEP_MS || '10000', 10) || 10000
);

const AUTO_TICK_MAX_BACKFILL = Math.max(
  10,
  parseInt(process.env.DEMO_FX_AUTO_TICK_MAX_BACKFILL || '180', 10) || 180
);

export function toNum(v: unknown, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function tfToSeconds(tf: TF): number {
  switch (tf) {
    case '1m':
      return 60;
    case '5m':
      return 300;
    case '15m':
      return 900;
    case '1h':
      return 3600;
    case '4h':
      return 14400;
    case '1D':
      return 86400;
    default:
      return 60;
  }
}

function toEpochMs(value: unknown): number {
  if (typeof value === 'number') {
    if (value > 2_000_000_000_000) return Math.floor(value);
    if (value > 20_000_000_000) return Math.floor(value);
    if (value > 2_000_000_000) return Math.floor(value * 1000);
    return Math.floor(value);
  }

  const s = String(value || '').trim();
  if (!s) return 0;

  const n = Number(s);
  if (Number.isFinite(n)) return toEpochMs(n);

  const d = Date.parse(s);
  return Number.isFinite(d) ? d : 0;
}

function round6(n: number) {
  return Number(n.toFixed(6));
}

function inferSpread(pair: RuntimePairRow, bid: number, ask: number, mid: number) {
  const liveSpread = ask > 0 && bid > 0 ? ask - bid : 0;
  const pip = Math.max(toNum(pair.pip_size, 0), 0.00001);
  const cfgSpread = Math.max(toNum(pair.spread, 0), 0);
  const safeCfgSpread = cfgSpread > 0 ? Math.max(cfgSpread, pip * 1.5) : 0;
  return Math.max(liveSpread, safeCfgSpread, pip * 1.5, mid * 0.00008);
}

export function getRuntimeMode(pair: Pick<RuntimePairRow, 'active_session_id' | 'mode'>) {
  return pair.active_session_id ? String(pair.mode || 'admin_script') : 'autopilot';
}

export function buildCandlesFromTickRows(
  rows: Array<{ mid?: unknown; bid?: unknown; ask?: unknown; ts: unknown }>,
  tf: TF,
  limit: number
): Candle[] {
  if (!Array.isArray(rows) || !rows.length) return [];

  const bucketSec = tfToSeconds(tf);
  const sorted = [...rows]
    .map((row) => {
      const ms = toEpochMs(row.ts);
      const bid = toNum(row.bid, 0);
      const ask = toNum(row.ask, 0);
      const midRaw = toNum(row.mid, 0);
      const mid =
        midRaw > 0 ? midRaw : bid > 0 && ask > 0 ? (bid + ask) / 2 : bid > 0 ? bid : ask;

      return {
        ms,
        sec: ms > 0 ? Math.floor(ms / 1000) : 0,
        mid,
      };
    })
    .filter((x) => x.sec > 0 && x.mid > 0)
    .sort((a, b) => a.sec - b.sec);

  if (!sorted.length) return [];

  const out: Candle[] = [];
  let current: Candle | null = null;
  let lastBucket: number | null = null;
  let lastClose: number | null = null;

  for (const row of sorted) {
    const bucket = Math.floor(row.sec / bucketSec) * bucketSec;

    if (!current || current.time !== bucket) {
      if (current) {
        out.push(current);
        lastClose = current.close;
        lastBucket = current.time;
      }

      if (lastBucket !== null && lastClose !== null) {
        const gapStart: number = lastBucket + bucketSec;

        for (let gap: number = gapStart; gap < bucket; gap += bucketSec) {
          out.push({
            time: gap,
            open: lastClose,
            high: lastClose,
            low: lastClose,
            close: lastClose,
            volume: 0,
          });
          lastBucket = gap;
        }
      }

      current = {
        time: bucket,
        open: row.mid,
        high: row.mid,
        low: row.mid,
        close: row.mid,
        volume: 1,
      };
      continue;
    }

    current.high = Math.max(current.high, row.mid);
    current.low = Math.min(current.low, row.mid);
    current.close = row.mid;
    current.volume = (current.volume || 0) + 1;
  }

  if (current) out.push(current);
  return out.slice(-limit);
}

export async function resolvePairRuntimeState<T extends RuntimePairRow>(
  supabase: SupabaseClient,
  pair: T
): Promise<T> {
  if (!pair.active_session_id) return pair;

  try {
    const { data: session } = await supabase
      .from('demo_fx_sessions')
      .select('id, status, duration_ms, elapsed_ms, started_at')
      .eq('id', pair.active_session_id)
      .maybeSingle();

    if (!session) {
      // Session was deleted — release pair back to autopilot
      await supabase
        .from('demo_fx_pairs')
        .update({
          active_session_id: null,
          mode: 'autopilot',
        })
        .eq('id', pair.id)
        .eq('active_session_id', pair.active_session_id);

      return {
        ...pair,
        active_session_id: null,
        mode: 'autopilot',
      };
    }

    let elapsed = toNum(session.elapsed_ms, 0);
    if (session.status === 'running' && session.started_at) {
      elapsed = Math.max(elapsed, Date.now() - new Date(session.started_at).getTime());
    }

    const durationMs = Math.max(0, toNum(session.duration_ms, 0));
    const expired =
      session.status !== 'running' || (durationMs > 0 && elapsed >= durationMs);

    if (!expired) return pair;

    // Session has expired or is not running — complete it and hand off to autopilot
    // Mark session as completed if it was running
    if (session.status === 'running') {
      await supabase
        .from('demo_fx_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          elapsed_ms: durationMs > 0 ? durationMs : elapsed,
          paused_at: null,
        })
        .eq('id', session.id)
        .eq('status', 'running');
    }

    // CRITICAL: Set mode to 'autopilot' (NOT 'manual') so cron seamlessly resumes
    // Keep the current bid/ask/seq intact for seamless price continuity
    await supabase
      .from('demo_fx_pairs')
      .update({
        active_session_id: null,
        mode: 'autopilot',
      })
      .eq('id', pair.id)
      .eq('active_session_id', pair.active_session_id);

    return {
      ...pair,
      active_session_id: null,
      mode: 'autopilot',
    };
  } catch {
    return pair;
  }
}

export async function ensurePairAutopilotFresh<T extends RuntimePairRow>(
  supabase: SupabaseClient,
  pair: T
): Promise<T> {
  if (pair.active_session_id) return pair;

  const bid = toNum(pair.current_bid, 0);
  const ask = toNum(pair.current_ask, 0);
  if (!(bid > 0) || !(ask > 0)) return pair;

  const now = Date.now();
  const lastUpdateMs = pair.price_updated_at ? new Date(pair.price_updated_at).getTime() : 0;
  const staleMs = lastUpdateMs > 0 ? now - lastUpdateMs : AUTO_TICK_STALE_MS + 1;

  if (!(staleMs >= AUTO_TICK_STALE_MS)) return pair;

  const { getNextTickFromPlanner } = await import('@/lib/demo-fx/candle-planner');
  const { appendDemoTickAndCandles, repriceOpenDemoTradesForPair } = await import(
    '@/lib/demo-fx/reprice-helpers'
  );

  const startMs =
    lastUpdateMs > 0 ? lastUpdateMs : now - Math.max(AUTO_TICK_STEP_MS, staleMs);

  const steps = Math.min(
    AUTO_TICK_MAX_BACKFILL,
    Math.max(1, Math.floor((now - startMs) / AUTO_TICK_STEP_MS))
  );

  let seq = toNum(pair.seq, 0);
  let curBid = bid;
  let curAsk = ask;
  let curMid = (bid + ask) / 2;
  const spread = inferSpread(pair, bid, ask, curMid);
  const tickRows: Array<{
    pair_id: string;
    session_id: null;
    bid: number;
    ask: number;
    mid: number;
    source: string;
    seq: number;
    ts: string;
  }> = [];

  for (let i = 1; i <= steps; i++) {
    seq += 1;

    const planned = getNextTickFromPlanner(
      'bg',
      pair.id,
      'range',
      0.5,
      curMid,
      0.0004,
      curMid,
      curMid,
      seq
    );

    const nextMid = Math.max(0.00001, toNum(planned?.mid, curMid));
    const nextBid = round6(nextMid - spread / 2);
    const nextAsk = round6(nextMid + spread / 2);
    const tickMs = Math.min(now, startMs + i * AUTO_TICK_STEP_MS);
    const tickIso = new Date(tickMs).toISOString();

    tickRows.push({
      pair_id: pair.id,
      session_id: null,
      bid: nextBid,
      ask: nextAsk,
      mid: round6(nextMid),
      source: 'system',
      seq,
      ts: tickIso,
    });

    curBid = nextBid;
    curAsk = nextAsk;
    curMid = nextMid;
  }

  const latestIso = tickRows[tickRows.length - 1]?.ts || new Date(now).toISOString();

  if (tickRows.length) {
    try {
      await supabase.from('demo_fx_ticks').insert(tickRows);
    } catch {}

    await supabase
      .from('demo_fx_pairs')
      .update({
        current_bid: curBid,
        current_ask: curAsk,
        seq,
        price_updated_at: latestIso,
      })
      .eq('id', pair.id);

    try {
      await appendDemoTickAndCandles(supabase, pair.id, null, curBid, curAsk, seq, 'system');
    } catch {}

    try {
      await repriceOpenDemoTradesForPair(supabase, pair.id, curBid, curAsk);
    } catch {}
  }

  return {
    ...pair,
    current_bid: curBid,
    current_ask: curAsk,
    seq,
    price_updated_at: latestIso,
  };
}