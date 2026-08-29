/**
 * Explicit no-store headers for every read endpoint.
 *
 * `export const dynamic = 'force-dynamic'` stops NEXT from caching the route,
 * but it does not guarantee the RESPONSE tells the browser and Vercel's edge
 * not to cache it. Without these headers a holdings response can sit in the
 * browser's disk cache for hours — which is exactly the "it shows up later"
 * symptom: the data was correct on the server the whole time, the client was
 * being handed an old copy.
 */
import { NextResponse } from 'next/server';

export const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
} as const;

/** Drop-in replacement for NextResponse.json on read endpoints. */
export function jsonNoStore(body: any, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: NO_STORE_HEADERS,
  });
}
