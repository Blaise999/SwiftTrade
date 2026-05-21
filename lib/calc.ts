// lib/calc.ts
//
// CANONICAL CALCULATIONS for the Swift Trade investing experience.
//
// Every screen that shows a value, P&L, %, or allocation MUST use these
// helpers. That guarantees the dashboard, portfolio, asset detail page
// and the buy preview never disagree by a rounding or formula bug.
//
// Rules:
//   • Money is in USD with 2-decimal display (never used for math —
//     compute in full precision, format only at the edge).
//   • Quantities can be fractional (Alpaca fractional shares).
//   • Percentages are in PERCENT (e.g. 4.2 = +4.2%), never decimal
//     fractions. Convert at the I/O boundary if needed.
//   • Avoid Number.toFixed() inside calculations — it returns strings.

// ── Safety ──
export const n = (v: unknown): number => {
  const x = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
};

// ── Position economics ──
export type PositionInput = {
  quantity: number;
  avgPrice: number;       // average cost basis (per share)
  currentPrice: number;
};

export type PositionMath = {
  costBasis: number;      // qty × avgPrice
  marketValue: number;    // qty × currentPrice
  pnl: number;            // marketValue − costBasis
  pnlPct: number;         // (pnl / costBasis) × 100, 0 when no cost
};

export function positionMath(p: PositionInput): PositionMath {
  const qty = n(p.quantity);
  const avg = n(p.avgPrice);
  const cur = n(p.currentPrice);
  const costBasis = qty * avg;
  const marketValue = qty * cur;
  const pnl = marketValue - costBasis;
  const pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  return { costBasis, marketValue, pnl, pnlPct };
}

// ── Today's change ──
// Daily P&L for a position = qty × (currentPrice − prevClose). When we
// don't have a true prevClose (catalog seed only), we back into it from
// the day's % change: prev = current / (1 + pct/100). For positions
// opened today, prev is the entry price.
export function todaysGainForPosition(
  quantity: number,
  currentPrice: number,
  dayChangePct: number,
): { gain: number; gainPct: number } {
  const qty = n(quantity);
  const cur = n(currentPrice);
  const pct = n(dayChangePct);
  if (qty <= 0 || cur <= 0) return { gain: 0, gainPct: 0 };
  const prevClose = cur / (1 + pct / 100);
  const gain = qty * (cur - prevClose);
  return { gain, gainPct: pct };
}

// ── Allocation slice ──
export function pct(part: number, whole: number): number {
  const w = n(whole);
  if (w <= 0) return 0;
  return (n(part) / w) * 100;
}

// ── Average-cost update on a buy ──
// New average cost when adding to an existing position.
//   newAvg = (prevQty × prevAvg + addQty × addPrice) / (prevQty + addQty)
// (i.e. weighted-mean by quantity — NOT by notional notional/qty mismatch.)
export function avgCostAfterBuy(
  prevQty: number, prevAvg: number, addQty: number, addPrice: number,
): { qty: number; avg: number } {
  const pq = n(prevQty), pa = n(prevAvg), aq = n(addQty), ap = n(addPrice);
  const qty = pq + aq;
  if (qty <= 0) return { qty: 0, avg: 0 };
  const avg = (pq * pa + aq * ap) / qty;
  return { qty, avg };
}

// ── Estimated shares from a dollar amount ──
export function estimatedShares(notional: number, price: number): number {
  const p = n(price);
  if (p <= 0) return 0;
  return n(notional) / p;
}
export function estimatedCost(quantity: number, price: number): number {
  return n(quantity) * n(price);
}

// ── Formatters (display only) ──
export function fmtUSD(v: number, opts?: { hideZeroCents?: boolean }): string {
  const x = n(v);
  const min = opts?.hideZeroCents && Math.abs(x % 1) < 0.005 ? 0 : 2;
  return `$${x.toLocaleString('en-US', {
    minimumFractionDigits: min,
    maximumFractionDigits: 2,
  })}`;
}
export function fmtPct(v: number, decimals = 2): string {
  const x = n(v);
  const sign = x > 0 ? '+' : '';
  return `${sign}${x.toFixed(decimals)}%`;
}
export function fmtSigned(v: number): string {
  const x = n(v);
  const sign = x > 0 ? '+' : x < 0 ? '−' : '';
  return `${sign}${fmtUSD(Math.abs(x))}`;
}
export function fmtQty(v: number, decimals = 4): string {
  return n(v).toFixed(decimals);
}
