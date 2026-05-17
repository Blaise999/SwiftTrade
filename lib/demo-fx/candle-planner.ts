// lib/demo-fx/candle-planner.ts
// ============================================================================
// CANDLE PLANNER v3 — BULLETPROOF PROFIT
// ============================================================================
// The price follows a GUIDED RANDOM WALK:
//   - Expected mid at progress P = start + (target - start) * P
//   - Actual mid wanders within a band around expected
//   - Band narrows as progress increases
//   - Price NEVER goes below start (bullish) or above start (bearish)
//   - Mixed red/green candles for realism
//   - Arrives at EXACT target at session end
// ============================================================================

function rand(): number { return Math.random(); }
function randBetween(a: number, b: number): number { return a + rand() * (b - a); }

// ─── PATH CACHE ─────────────────────────────────────────────────────────────
const pathCache = new Map<string, { bucket: number; path: number[]; idx: number }>();

/**
 * Get next tick price. Returns MID only — caller derives bid/ask using pair spread.
 */
export function getNextTickFromPlanner(
  sessionId: string,
  pairId: string,
  sessionType: string,
  progress: number,    // 0 to 1
  prevClose: number,   // previous mid
  volatility: number,
  startPrice: number,  // session start mid
  targetPrice: number, // session target mid
  tickSeq: number,
): { bid: number; ask: number; mid: number } {
  const key = `${sessionId}:${pairId}`;
  const bucket = Math.floor(Date.now() / 60000); // 1-minute bucket
  let cached = pathCache.get(key);

  if (!cached || cached.bucket !== bucket) {
    // Plan 60 ticks for this minute
    const path = planMinutePath(
      sessionType, progress, prevClose, volatility,
      startPrice, targetPrice, 60,
    );
    cached = { bucket, path, idx: 0 };
    pathCache.set(key, cached);
  }

  let mid: number;
  if (cached.idx < cached.path.length) {
    mid = cached.path[cached.idx];
    cached.idx++;
  } else {
    mid = cached.path[cached.path.length - 1] || prevClose;
  }

  // Return mid only — session-tick derives bid/ask from pair spread
  const tinySpread = mid * 0.00005;
  return {
    mid: Number(mid.toFixed(6)),
    bid: Number((mid - tinySpread / 2).toFixed(6)),
    ask: Number((mid + tinySpread / 2).toFixed(6)),
  };
}

/**
 * Plan 60 prices for one minute of a session.
 * Uses guided random walk — realistic variation but guaranteed direction.
 */
function planMinutePath(
  sessionType: string,
  progress: number,
  prevClose: number,
  volatility: number,
  startPrice: number,
  targetPrice: number,
  tickCount: number,
): number[] {
  const totalMove = targetPrice - startPrice;
  const isBullish = totalMove > 0;
  const absTotalMove = Math.abs(totalMove);

  // Expected mid at current progress point
  const expectedNow = startPrice + totalMove * progress;
  // Expected mid at end of this minute (~1/300 of session for 5min)
  const sessionDuration = 1; // normalized
  const minuteFraction = 1 / Math.max(1, Math.round((1 - progress) * 300));
  const expectedEnd = startPrice + totalMove * Math.min(1, progress + minuteFraction * 60);

  // How much the expected price moves this minute
  const expectedMoveThisMinute = expectedEnd - expectedNow;

  // Candle characteristics for this minute
  const atr = Math.max(Math.abs(expectedMoveThisMinute) * 1.5, prevClose * volatility, prevClose * 0.0003);

  // ─── Decide candle type ────────────────────────────────────────────
  const roll = rand();
  let candleBodyDir: number; // +1 = trend, -1 = counter-trend
  let candleBodySize: number;

  if (progress >= 0.90) {
    // FINAL: always trend direction, linear to target
    candleBodyDir = isBullish ? 1 : -1;
    candleBodySize = Math.abs(targetPrice - prevClose) * 0.3;
  } else if (progress >= 0.70) {
    // STRONG: 85% trend candles
    candleBodyDir = roll < 0.85 ? (isBullish ? 1 : -1) : (isBullish ? -1 : 1);
    candleBodySize = atr * randBetween(0.3, 1.0);
  } else {
    // ORGANIC: 65% trend, 20% pullback, 15% doji
    if (roll < 0.65) {
      candleBodyDir = isBullish ? 1 : -1;
      candleBodySize = atr * randBetween(0.3, 1.2);
    } else if (roll < 0.85) {
      // Pullback — but SMALL (max 40% of ATR)
      candleBodyDir = isBullish ? -1 : 1;
      candleBodySize = atr * randBetween(0.1, 0.4);
    } else {
      // Doji
      candleBodyDir = rand() > 0.5 ? 1 : -1;
      candleBodySize = atr * randBetween(0.02, 0.1);
    }
  }

  // ─── Ensure net movement is ALWAYS toward target ───────────────────
  // The close of this minute must be closer to target than prevClose
  const minCloseMove = Math.abs(expectedMoveThisMinute) * 0.3; // at minimum 30% of expected
  let rawClose = prevClose + candleBodyDir * candleBodySize;

  // Force close to be on the right side of expected
  if (isBullish) {
    rawClose = Math.max(rawClose, prevClose + minCloseMove);
    // Never go below start price
    rawClose = Math.max(rawClose, startPrice + absTotalMove * 0.01);
    // Don't overshoot target
    rawClose = Math.min(rawClose, targetPrice);
  } else {
    rawClose = Math.min(rawClose, prevClose - minCloseMove);
    rawClose = Math.min(rawClose, startPrice - absTotalMove * 0.01);
    rawClose = Math.max(rawClose, targetPrice);
  }

  // At 90%+ progress, force toward target
  if (progress >= 0.90) {
    const remaining = targetPrice - prevClose;
    const progressToEnd = (progress - 0.90) / 0.10; // 0 to 1 within final 10%
    rawClose = prevClose + remaining * (0.2 + progressToEnd * 0.8);
  }

  // ─── Build the 60-tick path ────────────────────────────────────────
  const open = prevClose;
  const close = Number(rawClose.toFixed(6));

  // Wicks
  const upperWick = atr * randBetween(0.05, 0.4);
  const lowerWick = atr * randBetween(0.05, 0.4);
  const high = Math.max(open, close) + upperWick;
  const low = Math.min(open, close) - lowerWick;

  // Clamp low to never breach start for bullish (or high for bearish)
  const clampedLow = isBullish ? Math.max(low, startPrice * 0.9999) : low;
  const clampedHigh = isBullish ? high : Math.min(high, startPrice * 1.0001);

  const path: number[] = [];

  // 5-phase intrabar path
  const phases = [
    { pct: 0.08, target: open },
    { pct: 0.15, target: candleBodyDir > 0 ? clampedLow : clampedHigh }, // probe wrong direction
    { pct: 0.40, target: candleBodyDir > 0 ? clampedHigh : clampedLow }, // impulse
    { pct: 0.20, target: close + (candleBodyDir > 0 ? upperWick * 0.1 : -lowerWick * 0.1) }, // retrace
    { pct: 0.17, target: close }, // settle
  ];

  let price = open;
  for (const phase of phases) {
    const count = Math.max(2, Math.round(tickCount * phase.pct));
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / count;
      price = price + (phase.target - price) * t;
      // Micro noise
      price += (rand() - 0.5) * atr * 0.01;

      // Safety clamp
      if (isBullish) price = Math.max(price, startPrice * 0.9999);
      else price = Math.min(price, startPrice * 1.0001);

      path.push(Number(price.toFixed(6)));
    }
  }

  // Pad/trim to exact tickCount
  while (path.length < tickCount) path.push(close);
  while (path.length > tickCount) path.pop();
  path[path.length - 1] = close;

  return path;
}

export function clearPlannerCache(sessionId: string, pairId: string): void {
  pathCache.delete(`${sessionId}:${pairId}`);
}
