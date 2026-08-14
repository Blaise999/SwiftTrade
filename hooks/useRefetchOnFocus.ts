'use client';
import { useEffect } from 'react';

/**
 * Re-runs `fn` when the page regains focus/visibility OR when a
 * 'holdings:changed' event fires (dispatched right after a buy/sell/shield).
 * This makes holdings appear instantly across every page — even on in-app
 * navigation, which doesn't trigger a window focus.
 */
export function useRefetchOnFocus(fn: () => void, deps: any[] = []) {
  useEffect(() => {
    const run = () => fn();
    const onVis = () => { if (document.visibilityState === 'visible') fn(); };
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('holdings:changed', run);
    return () => {
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('holdings:changed', run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Fire after any buy/sell/shield so every mounted holdings page refetches. */
export function notifyHoldingsChanged() {
  try { window.dispatchEvent(new Event('holdings:changed')); } catch {}
}
