'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NetWorth } from '@/lib/ledger/valuation';

/**
 * useNetWorth — one hook, one source of truth for the whole dashboard.
 * Reads /api/ledger/net-worth and polls so the number moves as prices move.
 *
 * Pass the current user's id (from your auth/store). Polling defaults to 15s;
 * pass 0 to disable.
 */
export function useNetWorth(userId: string | null | undefined, pollMs = 15000) {
  const [data, setData] = useState<NetWorth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/ledger/net-worth', {
        headers: { 'x-user-id': userId },
        cache: 'no-store',
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setData(j as NetWorth);
    } catch (e: any) {
      setError(e?.message || 'Failed to load net worth');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
    if (pollMs > 0) {
      timer.current = setInterval(load, pollMs);
      return () => {
        if (timer.current) clearInterval(timer.current);
      };
    }
  }, [load, pollMs]);

  return { data, loading, error, refresh: load };
}
