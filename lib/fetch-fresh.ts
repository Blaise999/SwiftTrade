/**
 * Cache-proof client fetching.
 *
 * `cache: 'no-store'` asks Next/the browser not to cache, but a response can
 * still be served from the browser's HTTP disk cache or an intermediary if the
 * headers allow it. A unique query param makes the URL itself different every
 * time, so NOTHING can serve a stale copy — this is what finally guarantees a
 * fresh buy shows immediately instead of appearing hours later.
 */
export function freshUrl(url: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_t=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Drop-in replacement for fetch() on any read that must never be cached. */
export function fetchFresh(url: string, init?: RequestInit): Promise<Response> {
  return fetch(freshUrl(url), {
    ...init,
    cache: 'no-store',
    headers: {
      ...(init?.headers || {}),
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
}

/** fetchFresh + json(), returning null on any failure. */
export async function getFresh<T = any>(url: string): Promise<T | null> {
  try {
    const r = await fetchFresh(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}
