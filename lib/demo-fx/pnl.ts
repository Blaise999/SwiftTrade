// lib/demo-fx/pnl.ts
// ============================================================================
// DEMO FX - PnL CALCULATION & TRADE LIFECYCLE
// ============================================================================
// Olymp-style: PnL = direction * investment * multiplier * ((current - entry) / entry)
//
// CRITICAL: Supabase returns DECIMAL columns as STRINGS.
// Every function must Number()-cast all inputs.
// ============================================================================

/** Safe number cast — never NaN, never Infinity */
function N(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ─── FLOATING PnL ───────────────────────────────────────────────────────────

export function calculateFloatingPnL(
  direction: any,
  investment: any,
  multiplier: any,
  entryPrice: any,
  currentBid: any,
  currentAsk: any
): { pnl: number; markPrice: number; pnlPercent: number } {
  const dir = N(direction);
  const inv = N(investment);
  const mult = N(multiplier);
  const entry = N(entryPrice);
  const bid = N(currentBid);
  const ask = N(currentAsk);

  if (entry <= 0 || inv <= 0) {
    return { pnl: 0, markPrice: 0, pnlPercent: 0 };
  }

  // Buy/Long → close at bid | Sell/Short → close at ask
  const markPrice = dir >= 1 ? bid : ask;

  let pnl = dir * inv * mult * ((markPrice - entry) / entry);

  // Cap loss at -investment (liquidation level)
  if (pnl < -inv) pnl = -inv;

  const pnlPercent = inv > 0 ? (pnl / inv) * 100 : 0;

  return {
    pnl: Number(pnl.toFixed(4)),
    markPrice,
    pnlPercent: Number(pnlPercent.toFixed(2)),
  };
}

// ─── LIQUIDATION PRICE ──────────────────────────────────────────────────────

export function calculateLiquidationPrice(
  direction: any,
  entryPrice: any,
  multiplier: any
): number {
  const dir = N(direction);
  const entry = N(entryPrice);
  const mult = N(multiplier);
  if (mult <= 0 || entry <= 0) return 0;
  const liq = entry * (1 - dir / mult);
  return Number(liq.toFixed(8));
}

// ─── SPREAD COST ────────────────────────────────────────────────────────────

export function calculateSpreadCost(
  bid: any,
  ask: any,
  investment: any,
  multiplier: any,
  entryPrice: any
): number {
  const entry = N(entryPrice);
  if (entry <= 0) return 0;
  const spread = N(ask) - N(bid);
  const spreadPct = spread / entry;
  return Number((spreadPct * N(investment) * N(multiplier)).toFixed(4));
}

// ─── ENTRY PRICE ────────────────────────────────────────────────────────────

export function getEntryPrice(direction: 'buy' | 'sell', bid: any, ask: any): number {
  return direction === 'buy' ? N(ask) : N(bid);
}

// ─── SL/TP CHECK ────────────────────────────────────────────────────────────

export interface SLTPResult {
  triggered: boolean;
  reason: 'stop_loss' | 'take_profit' | 'liquidation' | null;
  exitPrice: number | null;
}

export function checkSLTP(
  trade: { direction: any; stop_loss: any; take_profit: any; liquidation_price: any; entry_price: any },
  currentBid: any,
  currentAsk: any
): SLTPResult {
  const dir = N(trade.direction);
  const sl = N(trade.stop_loss);
  const tp = N(trade.take_profit);
  const liq = N(trade.liquidation_price);
  const bid = N(currentBid);
  const ask = N(currentAsk);

  // Mark price for closing: BUY→bid, SELL→ask
  const markPrice = dir >= 1 ? bid : ask;

  // Check liquidation first (most critical)
  if (liq > 0) {
    if (dir >= 1 && markPrice <= liq) {
      return { triggered: true, reason: 'liquidation', exitPrice: liq };
    }
    if (dir <= -1 && markPrice >= liq) {
      return { triggered: true, reason: 'liquidation', exitPrice: liq };
    }
  }

  // Check stop loss
  if (sl > 0) {
    if (dir >= 1 && markPrice <= sl) {
      return { triggered: true, reason: 'stop_loss', exitPrice: sl };
    }
    if (dir <= -1 && markPrice >= sl) {
      return { triggered: true, reason: 'stop_loss', exitPrice: sl };
    }
  }

  // Check take profit
  if (tp > 0) {
    if (dir >= 1 && markPrice >= tp) {
      return { triggered: true, reason: 'take_profit', exitPrice: tp };
    }
    if (dir <= -1 && markPrice <= tp) {
      return { triggered: true, reason: 'take_profit', exitPrice: tp };
    }
  }

  return { triggered: false, reason: null, exitPrice: null };
}

// ─── FINAL PnL ON CLOSE ────────────────────────────────────────────────────

export function calculateFinalPnL(
  direction: any,
  investment: any,
  multiplier: any,
  entryPrice: any,
  exitPrice: any
): number {
  const dir = N(direction);
  const inv = N(investment);
  const mult = N(multiplier);
  const entry = N(entryPrice);
  const exit = N(exitPrice);

  if (entry <= 0 || inv <= 0) return 0;
  let pnl = dir * inv * mult * ((exit - entry) / entry);

  // Cap loss at -investment
  if (pnl < -inv) pnl = -inv;

  return Number(pnl.toFixed(4));
}
