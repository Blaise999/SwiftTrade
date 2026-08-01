/**
 * sltp.ts — pure SL/TP + risk math for the FX ticket.
 * Matches the demo-fx and regular /api/trades models: investment × multiplier,
 * SL/TP as prices, PnL ≈ investment × multiplier × (move ÷ entry).
 */

export type Direction = 'buy' | 'sell';

export function pipSize(pairSymbol: string): number {
  return (pairSymbol || '').toUpperCase().includes('JPY') ? 0.01 : 0.0001;
}

export function priceFromPips(entry: number, pips: number, kind: 'sl' | 'tp', dir: Direction, pair: string): number {
  const d = pips * pipSize(pair);
  const sign = kind === 'sl' ? (dir === 'buy' ? -1 : 1) : dir === 'buy' ? 1 : -1;
  return round(entry + sign * d, pair);
}

export function pipsFromPrice(entry: number, price: number, pair: string): number {
  return Math.abs(price - entry) / pipSize(pair);
}

export function round(price: number, pair: string): number {
  const decimals = (pair || '').toUpperCase().includes('JPY') ? 3 : 5;
  return Number(price.toFixed(decimals));
}

export function validateSl(sl: number | null, entry: number, dir: Direction): string | null {
  if (sl == null) return null;
  if (!(sl > 0)) return 'Stop loss must be a positive price';
  if (dir === 'buy' && sl >= entry) return 'Buy stop loss must be below entry';
  if (dir === 'sell' && sl <= entry) return 'Sell stop loss must be above entry';
  return null;
}

export function validateTp(tp: number | null, entry: number, dir: Direction): string | null {
  if (tp == null) return null;
  if (!(tp > 0)) return 'Take profit must be a positive price';
  if (dir === 'buy' && tp <= entry) return 'Buy take profit must be above entry';
  if (dir === 'sell' && tp >= entry) return 'Sell take profit must be below entry';
  return null;
}

export function pnlAt(target: number, entry: number, dir: Direction, investment: number, multiplier: number): number {
  if (!(entry > 0)) return 0;
  const move = (target - entry) / entry;
  return investment * multiplier * (dir === 'buy' ? move : -move);
}

export function liquidationPrice(entry: number, dir: Direction, multiplier: number, pair: string): number {
  const frac = 1 / Math.max(multiplier, 1);
  return round(dir === 'buy' ? entry * (1 - frac) : entry * (1 + frac), pair);
}

export interface RiskPreview {
  slPips: number | null; tpPips: number | null;
  riskUsd: number | null; rewardUsd: number | null;
  rr: number | null; liq: number;
}

export function riskPreview(args: {
  entry: number; dir: Direction; investment: number; multiplier: number;
  sl: number | null; tp: number | null; pair: string;
}): RiskPreview {
  const { entry, dir, investment, multiplier, sl, tp, pair } = args;
  const riskUsd = sl != null ? pnlAt(sl, entry, dir, investment, multiplier) : null;
  const rewardUsd = tp != null ? pnlAt(tp, entry, dir, investment, multiplier) : null;
  const rr = riskUsd != null && rewardUsd != null && riskUsd !== 0 ? Math.abs(rewardUsd / riskUsd) : null;
  return {
    slPips: sl != null ? pipsFromPrice(entry, sl, pair) : null,
    tpPips: tp != null ? pipsFromPrice(entry, tp, pair) : null,
    riskUsd, rewardUsd, rr, liq: liquidationPrice(entry, dir, multiplier, pair),
  };
}
