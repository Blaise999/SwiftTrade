/**
 * valuation.ts — THE SPINE.
 *
 * One formula, read by every screen:
 *     Total Net Worth (USD) = cash + Σ(position.qty × live price)
 *
 * "cash" is users.balance_available (the single USD ledger). Everything else is
 * a view of this. Pure + price-source agnostic: pass cash, positions, prices.
 */

export type AssetClass = 'crypto' | 'stock' | 'etf' | 'fx';

export interface Position {
  symbol: string;
  assetClass: AssetClass;
  qty: number;
  avgPrice?: number;
}

export interface PricedPosition extends Position {
  price: number;
  valueUsd: number;
  costBasisUsd: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
}

export interface NetWorth {
  cashUsd: number;
  bonusUsd: number;
  positionsValueUsd: number;
  totalNetWorthUsd: number;
  totalUnrealizedPnlUsd: number;
  positions: PricedPosition[];
  unpriced: string[];
  pricedAt: string;
}

const num = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function computeNetWorth(
  cashUsd: number,
  bonusUsd: number,
  positions: Position[],
  priceMap: Record<string, number>,
): NetWorth {
  const upper: Record<string, number> = {};
  for (const [k, v] of Object.entries(priceMap || {})) upper[k.toUpperCase()] = num(v);

  const priced: PricedPosition[] = [];
  const unpriced: string[] = [];

  for (const p of positions || []) {
    const qty = num(p.qty);
    if (qty <= 0) continue;

    const price = upper[p.symbol?.toUpperCase()] ?? 0;
    if (price <= 0) unpriced.push(p.symbol);

    const valueUsd = qty * price;
    const avg = num(p.avgPrice);
    const costBasisUsd = qty * avg;
    const unrealizedPnlUsd = costBasisUsd > 0 ? valueUsd - costBasisUsd : 0;
    const unrealizedPnlPct = costBasisUsd > 0 ? (unrealizedPnlUsd / costBasisUsd) * 100 : 0;

    priced.push({ ...p, qty, price, valueUsd, costBasisUsd, unrealizedPnlUsd, unrealizedPnlPct });
  }

  const cash = num(cashUsd);
  const bonus = num(bonusUsd);
  const positionsValueUsd = priced.reduce((s, p) => s + p.valueUsd, 0);
  const totalUnrealizedPnlUsd = priced.reduce((s, p) => s + p.unrealizedPnlUsd, 0);

  return {
    cashUsd: cash,
    bonusUsd: bonus,
    positionsValueUsd,
    totalNetWorthUsd: cash + bonus + positionsValueUsd,
    totalUnrealizedPnlUsd,
    positions: priced,
    unpriced,
    pricedAt: new Date().toISOString(),
  };
}

export function symbolsToPrice(positions: Position[]): string[] {
  return Array.from(
    new Set((positions || []).filter((p) => num(p.qty) > 0).map((p) => p.symbol.toUpperCase())),
  );
}
