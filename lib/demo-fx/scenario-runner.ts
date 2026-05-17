// lib/demo-fx/scenario-runner.ts
// ============================================================================
// DEMO FX SCENARIO RUNNER ENGINE
// ============================================================================
// This is the core engine that:
// 1. Interpolates between scenario steps to produce smooth price ticks
// 2. Updates pair prices in the database
// 3. Recalculates floating PnL on all open trades
// 4. Checks SL/TP and auto-closes trades
// 5. Logs price history for chart rendering
//
// ARCHITECTURE:
// - Runs server-side via API calls (no persistent process needed)
// - Uses a "tick" approach: called every ~500ms-1s via setInterval or polling
// - Handles pause/resume via elapsed_ms tracking
// ============================================================================

import type {
  DemoFxScenario,
  DemoFxScenarioStep,
  DemoFxPair,
  InterpolatedTick,
  EasingType,
} from './types';
import { calculateFloatingPnL, checkSLTP, calculateFinalPnL } from './pnl';

// ─── EASING FUNCTIONS ───────────────────────────────────────────────────────

function applyEasing(t: number, easing: EasingType): number {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case 'ease-in':
      return clamped * clamped;
    case 'ease-out':
      return 1 - (1 - clamped) * (1 - clamped);
    case 'ease-in-out':
      return clamped < 0.5
        ? 2 * clamped * clamped
        : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
    case 'linear':
    default:
      return clamped;
  }
}

// ─── INTERPOLATION ──────────────────────────────────────────────────────────

/**
 * Given sorted steps and the current elapsed time in ms,
 * interpolate smooth bid/ask prices between steps.
 * Adds micro-noise for realism.
 */
export function interpolatePrice(
  steps: DemoFxScenarioStep[],
  elapsedMs: number,
  addNoise: boolean = true
): InterpolatedTick | null {
  if (!steps.length) return null;

  // Before first step → use first step values
  if (elapsedMs <= steps[0].offset_ms) {
    return {
      bid: steps[0].target_bid,
      ask: steps[0].target_ask,
      mid: (steps[0].target_bid + steps[0].target_ask) / 2,
      timestamp: Date.now(),
      step_from: 0,
      step_to: 0,
      progress: 0,
    };
  }

  // After last step → use last step values
  const lastStep = steps[steps.length - 1];
  if (elapsedMs >= lastStep.offset_ms) {
    return {
      bid: lastStep.target_bid,
      ask: lastStep.target_ask,
      mid: (lastStep.target_bid + lastStep.target_ask) / 2,
      timestamp: Date.now(),
      step_from: steps.length - 1,
      step_to: steps.length - 1,
      progress: 1,
    };
  }

  // Find the two steps we're between
  let fromIdx = 0;
  for (let i = 0; i < steps.length - 1; i++) {
    if (elapsedMs >= steps[i].offset_ms && elapsedMs < steps[i + 1].offset_ms) {
      fromIdx = i;
      break;
    }
  }

  const from = steps[fromIdx];
  const to = steps[fromIdx + 1];
  const segmentDuration = to.offset_ms - from.offset_ms;
  const segmentElapsed = elapsedMs - from.offset_ms;

  if (segmentDuration <= 0) {
    return {
      bid: to.target_bid,
      ask: to.target_ask,
      mid: (to.target_bid + to.target_ask) / 2,
      timestamp: Date.now(),
      step_from: fromIdx,
      step_to: fromIdx + 1,
      progress: 1,
    };
  }

  const rawProgress = segmentElapsed / segmentDuration;
  const easedProgress = applyEasing(rawProgress, to.easing || 'linear');

  let bid = from.target_bid + (to.target_bid - from.target_bid) * easedProgress;
  let ask = from.target_ask + (to.target_ask - from.target_ask) * easedProgress;

  // Add micro-noise for realism (±0.00001 range, ~1/10th of a pip)
  if (addNoise) {
    const noiseMag = Math.abs(to.target_bid - from.target_bid) * 0.02; // 2% of move
    const noiseCap = Math.max(noiseMag, 0.00001);
    const bidNoise = (Math.random() - 0.5) * 2 * noiseCap;
    const askNoise = (Math.random() - 0.5) * 2 * noiseCap;
    bid += bidNoise;
    ask += askNoise;
  }

  // Ensure ask >= bid
  if (ask < bid) {
    const mid = (bid + ask) / 2;
    const halfSpread = Math.abs(to.target_ask - to.target_bid) / 2 || 0.00015;
    bid = mid - halfSpread;
    ask = mid + halfSpread;
  }

  return {
    bid: Number(bid.toFixed(8)),
    ask: Number(ask.toFixed(8)),
    mid: Number(((bid + ask) / 2).toFixed(8)),
    timestamp: Date.now(),
    step_from: fromIdx,
    step_to: fromIdx + 1,
    progress: Number(rawProgress.toFixed(4)),
  };
}

// ─── SCENARIO ELAPSED TIME CALCULATOR ───────────────────────────────────────

/**
 * Calculate the effective elapsed time for a scenario considering pauses.
 */
export function getScenarioElapsedMs(scenario: {
  status: string;
  started_at: string | null;
  paused_at: string | null;
  elapsed_ms: number;
}): number {
  if (!scenario.started_at) return 0;

  const baseElapsed = scenario.elapsed_ms || 0;

  if (scenario.status === 'running') {
    // Currently running: add time since last resume/start
    const resumePoint = scenario.paused_at
      ? new Date(scenario.paused_at).getTime()
      : new Date(scenario.started_at).getTime();
    const now = Date.now();
    const sinceResume = now - resumePoint;
    // If there's been a pause, elapsed_ms already accounts for pre-pause time
    // and we measure from the start if never paused
    if (scenario.elapsed_ms > 0) {
      // Was paused before, elapsed_ms has pre-pause time
      // But we need to know when running resumed... 
      // The paused_at field is cleared on resume, so:
      return baseElapsed + (now - new Date(scenario.started_at).getTime() - baseElapsed);
    }
    return now - new Date(scenario.started_at).getTime();
  }

  if (scenario.status === 'paused') {
    return baseElapsed;
  }

  return baseElapsed;
}

/**
 * Simplified: For a running scenario, get total elapsed ms.
 * The scenario stores elapsed_ms = accumulated time before last pause.
 * If running, total = elapsed_ms + (now - time of last resume).
 * We'll store 'resumed_at' logic via started_at reuse.
 */
export function computeElapsedMs(scenario: {
  status: string;
  started_at: string | null;
  elapsed_ms: number;
}): number {
  if (scenario.status === 'paused' || scenario.status === 'stopped' || scenario.status === 'completed') {
    return scenario.elapsed_ms || 0;
  }
  if (scenario.status !== 'running' || !scenario.started_at) {
    return 0;
  }
  // Running: elapsed_ms has accumulated pre-pause time
  // started_at is updated on resume to act as "resumed_at"
  const runningSince = new Date(scenario.started_at).getTime();
  const accumulated = scenario.elapsed_ms || 0;
  return accumulated + (Date.now() - runningSince);
}

// ─── SCENARIO COMPLETION CHECK ──────────────────────────────────────────────

export function isScenarioComplete(
  steps: DemoFxScenarioStep[],
  elapsedMs: number,
  loopPlayback: boolean
): { complete: boolean; loopedElapsedMs?: number } {
  if (!steps.length) return { complete: true };

  const lastOffset = steps[steps.length - 1].offset_ms;

  if (elapsedMs >= lastOffset) {
    if (loopPlayback) {
      return { complete: false, loopedElapsedMs: elapsedMs % lastOffset };
    }
    return { complete: true };
  }

  return { complete: false };
}

// ─── PROCESS OPEN TRADES ────────────────────────────────────────────────────

export interface TradeUpdate {
  trade_id: string;
  floating_pnl: number;
  current_price: number;
  should_close: boolean;
  close_reason?: 'stop_loss' | 'take_profit' | 'liquidation';
  exit_price?: number;
  final_pnl?: number;
}

/**
 * Given current bid/ask and a list of open trades, compute updates.
 */
export function processOpenTrades(
  trades: Array<{
    id: string;
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
      const finalPnl = calculateFinalPnL(
        trade.direction,
        trade.investment,
        trade.multiplier,
        trade.entry_price,
        sltpResult.exitPrice
      );

      updates.push({
        trade_id: trade.id,
        floating_pnl: pnl,
        current_price: markPrice,
        should_close: true,
        close_reason: sltpResult.reason,
        exit_price: sltpResult.exitPrice,
        final_pnl: finalPnl,
      });
    } else {
      updates.push({
        trade_id: trade.id,
        floating_pnl: pnl,
        current_price: markPrice,
        should_close: false,
      });
    }
  }

  return updates;
}

// ─── GENERATE CHART CANDLES FROM PRICE LOG ──────────────────────────────────

export function generateCandlesFromPriceLog(
  priceLogs: Array<{ bid: number; ask: number; logged_at: string }>,
  intervalSeconds: number = 60
): Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }> {
  if (!priceLogs.length) return [];

  const candles: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }> = [];
  let currentBucket = 0;
  let currentCandle: { time: number; open: number; high: number; low: number; close: number; ticks: number } | null = null;

  for (const log of priceLogs) {
    const ts = Math.floor(new Date(log.logged_at).getTime() / 1000);
    const bucketTime = Math.floor(ts / intervalSeconds) * intervalSeconds;
    const mid = (log.bid + log.ask) / 2;

    if (!currentCandle || bucketTime !== currentBucket) {
      if (currentCandle) {
        candles.push({
          time: currentCandle.time,
          open: Number(currentCandle.open.toFixed(8)),
          high: Number(currentCandle.high.toFixed(8)),
          low: Number(currentCandle.low.toFixed(8)),
          close: Number(currentCandle.close.toFixed(8)),
          volume: currentCandle.ticks * 100,
        });
      }
      currentBucket = bucketTime;
      currentCandle = {
        time: bucketTime,
        open: mid,
        high: mid,
        low: mid,
        close: mid,
        ticks: 1,
      };
    } else {
      currentCandle.high = Math.max(currentCandle.high, mid);
      currentCandle.low = Math.min(currentCandle.low, mid);
      currentCandle.close = mid;
      currentCandle.ticks++;
    }
  }

  // Push last candle
  if (currentCandle) {
    candles.push({
      time: currentCandle.time,
      open: Number(currentCandle.open.toFixed(8)),
      high: Number(currentCandle.high.toFixed(8)),
      low: Number(currentCandle.low.toFixed(8)),
      close: Number(currentCandle.close.toFixed(8)),
      volume: currentCandle.ticks * 100,
    });
  }

  return candles;
}
