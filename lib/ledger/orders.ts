'use client';

/**
 * orders.ts — one client entry point for placing trades, so every screen writes
 * the SAME server ledger instead of a local zustand store.
 *
 * The stocks screen currently calls executeStockBuy/executeStockSell from
 * useTradingAccountStore — those never touch users.balance_available, so they're
 * invisible to net worth. Swap them for placeEquityOrder() below and equities
 * fold into the one true number.
 */

export interface OrderResult {
  ok: boolean;
  error?: string;
  qty?: number;
  price?: number;
  cost?: number;
}

/** Stocks / ETFs → /api/invest/order (writes `positions` + balance_available). */
export async function placeEquityOrder(params: {
  userId: string;
  symbol: string;
  assetType: 'stock' | 'etf';
  side: 'buy' | 'sell';
  amountType: 'notional' | 'qty';
  amount: number;
  price: number;
}): Promise<OrderResult> {
  try {
    const r = await fetch('/api/invest/order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    });
    const j = await r.json();
    if (!r.ok || j?.ok === false) return { ok: false, error: j?.error || `HTTP ${r.status}` };
    return { ok: true, ...j };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'network error' };
  }
}

/** Crypto → /api/crypto/trade (writes `crypto_positions` + balance_available). */
export async function placeCryptoOrder(params: {
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amountType: 'notional' | 'qty';
  amount: number;
  price: number;
}): Promise<OrderResult> {
  try {
    const r = await fetch('/api/crypto/trade', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': params.userId },
      body: JSON.stringify(params),
    });
    const j = await r.json();
    if (!r.ok || j?.ok === false) return { ok: false, error: j?.error || `HTTP ${r.status}` };
    return { ok: true, ...j };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'network error' };
  }
}
