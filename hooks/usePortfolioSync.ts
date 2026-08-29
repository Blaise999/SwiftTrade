'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { freshUrl } from '@/lib/fetch-fresh';
import { trace } from '@/lib/trace';

/**
 * ONE shared portfolio cache for every page.
 *
 * Why this exists: pages used to each fetch their own holdings on mount, so a
 * buy made on one screen wasn't visible on another until that screen happened
 * to remount. Now every page reads the same store, and any trade calls
 * `syncPortfolio()` which refetches once and pushes to all subscribers
 * immediately — no reload, no waiting.
 */

type Snapshot = {
  crypto: any[];
  stocks: any[];
  investTotals: any | null;
  balance: number;
  at: number;
};

const EMPTY: Snapshot = { crypto: [], stocks: [], investTotals: null, balance: 0, at: 0 };

let snapshot: Snapshot = EMPTY;
let currentUserId = '';
let inflight: Promise<void> | null = null;
const subs = new Set<(s: Snapshot) => void>();

function emit() { subs.forEach((fn) => fn(snapshot)); }

/** Refetch holdings + balance, then push to every mounted page. */
export async function syncPortfolio(userId?: string): Promise<void> {
  const uid = userId || currentUserId;
  if (!uid) return;
  currentUserId = uid;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const [hRes, iRes, uRes] = await Promise.all([
        fetch(freshUrl(`/api/holdings?userId=${uid}&market=crypto`), { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch(freshUrl(`/api/invest/positions?userId=${uid}`), { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch(freshUrl(`/api/user/balance?userId=${uid}`), { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      ]);
      trace('sync', 'refetched', {
        uid,
        crypto: Array.isArray(hRes?.holdings) ? hRes.holdings.length : 'none',
        stocks: Array.isArray(iRes?.positions) ? iRes.positions.length : 'none',
      });
      snapshot = {
        crypto: Array.isArray(hRes?.holdings) ? hRes.holdings : snapshot.crypto,
        stocks: Array.isArray(iRes?.positions) ? iRes.positions : snapshot.stocks,
        investTotals: iRes?.ok ? iRes : snapshot.investTotals,
        balance: Number(uRes?.balance_available ?? uRes?.balance ?? snapshot.balance) || snapshot.balance,
        at: Date.now(),
      };
      emit();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Optimistically add/adjust a holding so the UI moves the instant you tap. */
export function applyOptimisticTrade(opts: {
  symbol: string; kind: 'crypto' | 'stock'; side: 'buy' | 'sell';
  quantity: number; price: number; cost: number;
}) {
  const { symbol, kind, side, quantity, price, cost } = opts;
  const sym = symbol.toUpperCase();
  const delta = side === 'buy' ? quantity : -quantity;
  const list = kind === 'crypto' ? [...snapshot.crypto] : [...snapshot.stocks];
  const i = list.findIndex((h: any) => String(h.symbol).toUpperCase() === sym);

  if (i >= 0) {
    const prev = Number(list[i].quantity) || 0;
    const next = prev + delta;
    if (next <= 1e-9) list.splice(i, 1);
    else list[i] = { ...list[i], quantity: next, price, value: next * price };
  } else if (side === 'buy') {
    list.push({ symbol: sym, quantity, avgPrice: price, price, value: quantity * price });
  }

  snapshot = {
    ...snapshot,
    crypto: kind === 'crypto' ? list : snapshot.crypto,
    stocks: kind === 'stock' ? list : snapshot.stocks,
    balance: Math.max(0, snapshot.balance + (side === 'buy' ? -cost : cost)),
    at: Date.now(),
  };
  trace('sync', 'optimistic applied', { symbol: sym, kind, side, quantity, cryptoCount: snapshot.crypto.length, stockCount: snapshot.stocks.length });
  emit();
}

/** Subscribe a page to the shared portfolio. */
export function usePortfolioSync(userId?: string) {
  const [snap, setSnap] = useState<Snapshot>(snapshot);
  const started = useRef(false);

  useEffect(() => {
    subs.add(setSnap);
    return () => { subs.delete(setSnap); };
  }, []);

  useEffect(() => {
    if (!userId) return;
    currentUserId = userId;
    // fetch on mount if we have nothing, or if the cache is older than 20s
    if (!started.current || Date.now() - snapshot.at > 20_000) {
      started.current = true;
      syncPortfolio(userId);
    }
  }, [userId]);

  // refetch when the tab regains focus or another surface signals a change
  useEffect(() => {
    const run = () => syncPortfolio();
    const onVis = () => { if (document.visibilityState === 'visible') syncPortfolio(); };
    window.addEventListener('focus', run);
    window.addEventListener('holdings:changed', run);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', run);
      window.removeEventListener('holdings:changed', run);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const refresh = useCallback(() => syncPortfolio(userId), [userId]);
  return { ...snap, refresh };
}
