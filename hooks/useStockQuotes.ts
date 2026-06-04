'use client';

import { useEffect, useRef, useState } from 'react';

export type LiveQuote = {
  price: number;
  changePercent24h: number;
};

export type LiveQuoteMap = Record<string, LiveQuote>;

/**
 * useStockQuotes
 * ----------------
 * Polls /api/market/stocks/quotes for the given symbols and returns a map of
 * live { price, changePercent24h }. It is intentionally fault-tolerant: if the
 * market data provider is unavailable (e.g. no API key configured), it simply
 * returns an empty map and the UI keeps showing its seed prices. No errors, no
 * spinners that never resolve, no console noise.
 *
 * Symbols are de-duplicated and capped so a single request stays fast.
 */
export function useStockQuotes(symbols: string[], intervalMs = 15_000): LiveQuoteMap {
  const [quotes, setQuotes] = useState<LiveQuoteMap>({});
  // Stable key so the effect only re-runs when the symbol set really changes.
  const key = Array.from(new Set(symbols.map((s) => s.toUpperCase()))).sort().join(',');
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if (!key) return;
    let alive = true;
    const ac = new AbortController();

    const all = key.split(',').filter(Boolean);
    // Provider caps batches; chunk into groups of 25.
    const chunks: string[][] = [];
    for (let i = 0; i < all.length; i += 25) chunks.push(all.slice(i, i + 25));

    const tick = async () => {
      try {
        const results = await Promise.all(
          chunks.map(async (group) => {
            try {
              const res = await fetch(
                `/api/market/stocks/quotes?symbols=${encodeURIComponent(group.join(','))}`,
                { cache: 'no-store', signal: ac.signal },
              );
              if (!res.ok) return {};
              return (await res.json()) as Record<string, any>;
            } catch {
              return {};
            }
          }),
        );

        if (!alive) return;

        const merged: LiveQuoteMap = {};
        for (const r of results) {
          for (const sym of Object.keys(r || {})) {
            const q = r[sym];
            const price = Number(q?.price);
            const pct = Number(q?.changePercent24h);
            if (Number.isFinite(price) && price > 0) {
              merged[sym] = {
                price,
                changePercent24h: Number.isFinite(pct) ? pct : 0,
              };
            }
          }
        }

        if (Object.keys(merged).length) {
          setQuotes((prev) => ({ ...prev, ...merged }));
        }
      } catch {
        /* swallow — keep seed prices */
      }
    };

    tick();
    const id = setInterval(tick, Math.max(5_000, intervalMs));
    return () => {
      alive = false;
      ac.abort();
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, intervalMs]);

  return quotes;
}
