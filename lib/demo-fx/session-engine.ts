// lib/demo-fx/session-engine.ts
// ============================================================================
// SESSION-BASED RARE PAIR ENGINE
// ============================================================================
// Generates ticks for a running session based on session_type, duration,
// start/target prices, and volatility. Builds candles from ticks.
// Single source of truth for rare pair prices.

import { calculateFloatingPnL, checkSLTP, calculateFinalPnL } from './pnl';

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type SessionType = 'bullish' | 'bearish' | 'range' | 'reversal' | 'crash' | 'spike' | 'custom';
export type SessionStatus = 'pending' | 'running' | 'paused' | 'completed' | 'stopped';

export interface DemoFxSession {
  id: string;
  pair_id: string;
  session_type: SessionType;
  duration_ms: number;
  tick_interval_ms: number;
  volatility: number;
  start_bid: number;
  start_ask: number;
  target_bid: number;
  target_ask: number;
  status: SessionStatus;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  elapsed_ms: number;
  tick_seq: number;
  lesson_title: string | null;
  lesson_description: string | null;
  student_instructions: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionTick {
  pair_id: string;
  session_id: string;
  bid: number;
  ask: number;
  mid: number;
  source: 'session' | 'manual' | 'system';
  seq: number;
  ts: string; // ISO timestamp
}

export interface CandleRow {
  pair_id: string;
  session_id: string | null;
  timeframe: string;
  bucket_start: string; // ISO timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  tick_count: number;
}

// ─── COMPUTE ELAPSED ────────────────────────────────────────────────────────

export function computeSessionElapsed(session: {
  status: string;
  started_at: string | null;
  elapsed_ms: number;
}): number {
  if (session.status !== 'running' || !session.started_at) {
    return session.elapsed_ms || 0;
  }
  const runningSince = new Date(session.started_at).getTime();
  const accumulated = session.elapsed_ms || 0;
  return accumulated + (Date.now() - runningSince);
}

// ─── PROGRESS ───────────────────────────────────────────────────────────────

export function computeProgress(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  return Math.min(1, Math.max(0, elapsedMs / durationMs));
}

// ─── PRICE GENERATION ───────────────────────────────────────────────────────

/**
 * Generate the current bid/ask for a session at a given progress (0..1).
 * Different session types produce different price curves.
 */
export function generateSessionPrice(
  session: {
    session_type: SessionType;
    start_bid: number;
    start_ask: number;
    target_bid: number;
    target_ask: number;
    volatility: number;
  },
  progress: number,
  tickSeq: number
): { bid: number; ask: number; mid: number } {
  const { session_type, start_bid, start_ask, target_bid, target_ask, volatility } = session;
  const t = Math.max(0, Math.min(1, progress));

  let trendFactor: number;

  switch (session_type) {
    case 'bullish':
      // Smooth ease-out upward curve
      trendFactor = 1 - Math.pow(1 - t, 2.2);
      break;

    case 'bearish':
      // Smooth ease-out downward curve
      trendFactor = 1 - Math.pow(1 - t, 2.2);
      break;

    case 'range':
      // Oscillate around midpoint with diminishing amplitude
      trendFactor = 0.5 + 0.4 * Math.sin(t * Math.PI * 6) * (1 - t * 0.5);
      break;

    case 'reversal':
      // Go to target, then reverse back toward start
      if (t < 0.5) {
        trendFactor = 2 * t; // first half: go to target
      } else {
        trendFactor = 2 * (1 - t); // second half: come back
      }
      break;

    case 'crash':
      // Slow buildup then sudden drop
      if (t < 0.7) {
        trendFactor = t * 0.15; // gentle rise
      } else {
        trendFactor = 0.15 * 0.7 + (t - 0.7) / 0.3 * (1 - 0.15 * 0.7); // sharp move to target
      }
      break;

    case 'spike':
      // Sudden spike then settle
      if (t < 0.2) {
        trendFactor = (t / 0.2) * 1.3; // overshoot
      } else if (t < 0.4) {
        trendFactor = 1.3 - ((t - 0.2) / 0.2) * 0.3; // settle back to target
      } else {
        trendFactor = 1.0;
      }
      break;

    case 'custom':
    default:
      // Linear interpolation
      trendFactor = t;
      break;
  }

  // Interpolate base price
  let bid = start_bid + (target_bid - start_bid) * trendFactor;
  let ask = start_ask + (target_ask - start_ask) * trendFactor;

  // Add micro-noise for realism (seeded by tickSeq for consistency)
  const vol = Number(volatility) || 0.0008;
  const seed1 = Math.sin(tickSeq * 12.9898 + 78.233) * 43758.5453;
  const noise1 = (seed1 - Math.floor(seed1) - 0.5) * 2 * vol;
  const seed2 = Math.sin(tickSeq * 93.4856 + 12.789) * 24681.1357;
  const noise2 = (seed2 - Math.floor(seed2) - 0.5) * 2 * vol;

  bid += noise1;
  ask += noise2;

  // Ensure ask >= bid with minimum spread
  const minSpread = Math.abs(start_ask - start_bid) * 0.3;
  if (ask - bid < minSpread) {
    const mid = (bid + ask) / 2;
    bid = mid - minSpread / 2;
    ask = mid + minSpread / 2;
  }

  bid = Number(bid.toFixed(8));
  ask = Number(ask.toFixed(8));
  const mid = Number(((bid + ask) / 2).toFixed(8));

  return { bid, ask, mid };
}

// ─── CANDLE BUCKETING ───────────────────────────────────────────────────────

const TF_MS: Record<string, number> = {
  '1m': 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '1h': 60 * 60_000,
};

export function getBucketStart(tsMs: number, timeframe: string): number {
  const intervalMs = TF_MS[timeframe] || 60_000;
  return Math.floor(tsMs / intervalMs) * intervalMs;
}

/**
 * Build/update candle rows from a single tick.
 * Returns upsert data for each timeframe.
 */
export function buildCandleUpdates(
  tick: SessionTick,
  timeframes: string[] = ['1m', '5m']
): CandleRow[] {
  const tsMs = new Date(tick.ts).getTime();
  const rows: CandleRow[] = [];

  for (const tf of timeframes) {
    const bucketMs = getBucketStart(tsMs, tf);
    rows.push({
      pair_id: tick.pair_id,
      session_id: tick.session_id,
      timeframe: tf,
      bucket_start: new Date(bucketMs).toISOString(),
      open: tick.mid,
      high: tick.mid,
      low: tick.mid,
      close: tick.mid,
      tick_count: 1,
    });
  }

  return rows;
}

// ─── TRADE PROCESSING ───────────────────────────────────────────────────────

export interface TradeUpdate {
  trade_id: string;
  user_id: string;
  floating_pnl: number;
  current_price: number;
  should_close: boolean;
  close_reason?: 'stop_loss' | 'take_profit' | 'liquidation';
  exit_price?: number;
  final_pnl?: number;
  return_amount?: number; // investment + final_pnl to return to balance
}

export function processOpenTrades(
  trades: Array<{
    id: string;
    user_id: string;
    direction: 1 | -1;
    investment: number;
    multiplier: number;
    entry_price: number;
    stop_loss: number | null;
    take_profit: number | null;
    liquidation_price: number | null;
  }>,
  currentBid: number,
  currentAsk: number
): TradeUpdate[] {
  const updates: TradeUpdate[] = [];

  for (const trade of trades) {
    const { pnl, markPrice } = calculateFloatingPnL(
      trade.direction,
      trade.investment,
      trade.multiplier,
      trade.entry_price,
      currentBid,
      currentAsk
    );

    const sltpResult = checkSLTP(trade, currentBid, currentAsk);

    if (sltpResult.triggered && sltpResult.exitPrice != null && sltpResult.reason) {
      const fp = calculateFinalPnL(
        trade.direction,
        trade.investment,
        trade.multiplier,
        trade.entry_price,
        sltpResult.exitPrice
      );
      const returnAmt = Math.max(0, Number(trade.investment) + fp);

      updates.push({
        trade_id: trade.id,
        user_id: trade.user_id,
        floating_pnl: pnl,
        current_price: markPrice,
        should_close: true,
        close_reason: sltpResult.reason,
        exit_price: sltpResult.exitPrice,
        final_pnl: fp,
        return_amount: returnAmt,
      });
    } else {
      updates.push({
        trade_id: trade.id,
        user_id: trade.user_id,
        floating_pnl: pnl,
        current_price: markPrice,
        should_close: false,
      });
    }
  }

  return updates;
}
