/**
 * GET /api/debug/trace?userId=...
 *
 * One call that walks the ENTIRE chain and reports where a holding is lost:
 *   DB rows -> what /api/holdings returns -> what /api/invest/positions returns
 *   -> what /api/spot-state returns -> recent activity rows
 *
 * If the DB has the row but an endpoint returns 0, the break is in that endpoint.
 * If every endpoint returns it but the screen is empty, the break is client-side
 * (stale localStorage, or the page reading a different user id).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'service role not configured' }, { status: 503 });
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId') || '';
  if (!userId) return NextResponse.json({ error: 'pass ?userId=' }, { status: 400 });

  const origin = url.origin;
  const out: any = { userId, steps: {} };

  // STEP 1 — raw database
  const [cp, pos, utd, tx, tr] = await Promise.all([
    sb.from('crypto_positions').select('symbol, quantity, updated_at').eq('user_id', userId),
    sb.from('positions').select('symbol, quantity, updated_at').eq('user_id', userId),
    sb.from('user_trading_data').select('spot_crypto_state, updated_at').eq('user_id', userId).maybeSingle(),
    sb.from('transactions').select('type, symbol, amount, created_at').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(5),
    sb.from('trades').select('symbol, side, created_at').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(5),
  ]);

  out.steps['1_database'] = {
    crypto_positions: (cp.data || []).map((r: any) => `${r.symbol}:${r.quantity}`),
    positions: (pos.data || []).map((r: any) => `${r.symbol}:${r.quantity}`),
    spot_crypto_state: ((utd.data?.spot_crypto_state as any)?.positions || []).map((p: any) => `${p.symbol}:${p.quantity}`),
    recent_transactions: (tx.data || []).map((r: any) => `${r.type} ${r.symbol || ''} $${r.amount}`),
    recent_trades: (tr.data || []).map((r: any) => `${r.side} ${r.symbol}`),
    errors: {
      crypto_positions: cp.error?.message || null,
      positions: pos.error?.message || null,
      user_trading_data: utd.error?.message || null,
      transactions: tx.error?.message || null,
      trades: tr.error?.message || null,
    },
  };

  // STEP 2 — what the read endpoints actually return
  const call = async (path: string) => {
    try {
      const r = await fetch(`${origin}${path}`, { cache: 'no-store' });
      const j = await r.json();
      return { status: r.status, body: j };
    } catch (e: any) { return { status: 0, error: String(e?.message || e) }; }
  };

  const [holdings, invest, spot, history, activity] = await Promise.all([
    call(`/api/holdings?userId=${userId}&market=crypto`),
    call(`/api/invest/positions?userId=${userId}`),
    call(`/api/spot-state?userId=${userId}`),
    call(`/api/history?userId=${userId}`),
    call(`/api/activity?userId=${userId}`),
  ]);

  out.steps['2_endpoints'] = {
    'GET /api/holdings': {
      status: holdings.status,
      count: holdings.body?.holdings?.length ?? null,
      symbols: (holdings.body?.holdings || []).map((h: any) => h.symbol),
    },
    'GET /api/invest/positions': {
      status: invest.status,
      count: invest.body?.positions?.length ?? null,
      symbols: (invest.body?.positions || []).map((p: any) => p.symbol),
    },
    'GET /api/spot-state': {
      status: spot.status,
      count: spot.body?.state?.positions?.length ?? null,
    },
    'GET /api/history': { status: history.status, count: history.body?.items?.length ?? null },
    'GET /api/activity': { status: activity.status, count: activity.body?.items?.length ?? null },
  };

  // STEP 3 — verdict
  const dbCrypto = (cp.data || []).length;
  const dbStocks = (pos.data || []).length;
  const apiCrypto = holdings.body?.holdings?.length ?? 0;
  const apiStocks = invest.body?.positions?.length ?? 0;

  const problems: string[] = [];
  if (dbCrypto > 0 && apiCrypto === 0) problems.push('crypto rows exist in DB but /api/holdings returns none — break is in that endpoint');
  if (dbStocks > 0 && apiStocks === 0) problems.push('stock rows exist in DB but /api/invest/positions returns none — break is in that endpoint');
  if (dbCrypto === 0 && dbStocks === 0) problems.push('NO holdings in the database for this user id — either the buy failed or you are viewing a different account');
  if ((history.body?.items?.length ?? 0) === 0 && (tx.data || []).length > 0) problems.push('transactions exist but /api/history returns none');

  out.verdict = problems.length
    ? problems
    : ['Server chain is healthy — the DB rows reach every endpoint. If the screen is still empty, the break is CLIENT-side: stale localStorage, or the page is using a different user id. Hard-refresh and compare this userId to the one your session reports.'];

  return NextResponse.json(out);
}
