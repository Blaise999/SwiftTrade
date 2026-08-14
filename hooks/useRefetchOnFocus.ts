'use client';
import { useEffect } from 'react';

/**
 * Re-runs `fn` whenever the page regains focus or becomes visible again.
 * Fixes stale holdings after a buy on another page: navigating back or
 * re-focusing the tab pulls fresh data instead of the cached view.
 */
export function useRefetchOnFocus(fn: () => void, deps: any[] = []) {
  useEffect(() => {
    const onFocus = () => fn();
    const onVis = () => { if (document.visibilityState === 'visible') fn(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
