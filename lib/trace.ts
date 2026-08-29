/**
 * Trade tracing. Every step of a buy/sell writes a tagged line so a broken
 * link in the chain is obvious in the Vercel logs and in the browser console.
 *
 * Server lines:  [TRACE:server] ...
 * Client lines:  [TRACE:client] ...
 *
 * Enable verbose client tracing with NEXT_PUBLIC_TRACE=1 (server always logs).
 */

const ON_CLIENT = typeof window !== 'undefined';
const CLIENT_VERBOSE = ON_CLIENT && process.env.NEXT_PUBLIC_TRACE === '1';

function stamp() {
  return new Date().toISOString().slice(11, 23);
}

export function trace(scope: string, msg: string, data?: any) {
  const tag = ON_CLIENT ? 'TRACE:client' : 'TRACE:server';
  if (ON_CLIENT && !CLIENT_VERBOSE) return;
  try {
    // eslint-disable-next-line no-console
    console.log(`[${tag}] ${stamp()} ${scope} :: ${msg}`, data !== undefined ? data : '');
  } catch {}
}

/** Always logs, both sides — use for failures. */
export function traceError(scope: string, msg: string, err?: any) {
  const tag = ON_CLIENT ? 'TRACE:client' : 'TRACE:server';
  try {
    // eslint-disable-next-line no-console
    console.error(`[${tag}] ${stamp()} ${scope} :: ❌ ${msg}`, err?.message || err || '');
  } catch {}
}

/** Wrap a Supabase result: logs the error and returns whether it succeeded. */
export function traceDb(scope: string, op: string, res: { error?: any; data?: any }) {
  if (res?.error) {
    traceError(scope, `${op} FAILED`, res.error);
    return false;
  }
  trace(scope, `${op} ok`, Array.isArray(res?.data) ? `${res.data.length} rows` : undefined);
  return true;
}
