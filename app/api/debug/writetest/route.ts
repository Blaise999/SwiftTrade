/**
 * GET /api/debug/writetest?userId=...
 *
 * Attempts every write the buy flow performs and reports the REAL error for
 * each. Silent failures here are why a trade can deduct balance, fire a
 * notification, and still leave no position or activity row.
 * Test rows are cleaned up afterwards.
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
  const userId = new URL(req.url).searchParams.get('userId') || '';
  if (!userId) return NextResponse.json({ error: 'pass ?userId=' }, { status: 400 });

  const R: Record<string, any> = {};
  const SYM = '__TEST__';

  // 1. crypto_positions upsert with onConflict — needs UNIQUE(user_id,symbol)
  {
    const { error } = await sb.from('crypto_positions').upsert(
      { user_id: userId, symbol: SYM, quantity: 1, avg_buy_price: 1, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,symbol' });
    R['crypto_positions.upsert(onConflict user_id,symbol)'] =
      error ? { ok: false, error: error.message, hint: error.hint || null, code: error.code || null } : { ok: true };
  }

  // 2. positions insert
  {
    const { error } = await sb.from('positions').insert(
      { user_id: userId, symbol: SYM, asset_type: 'stock', quantity: 1, avg_entry_price: 1, market_value: 1 });
    R['positions.insert'] =
      error ? { ok: false, error: error.message, hint: error.hint || null, code: error.code || null } : { ok: true };
  }

  // 3. positions upsert with onConflict — needs UNIQUE(user_id,symbol)
  {
    const { error } = await sb.from('positions').upsert(
      { user_id: userId, symbol: SYM + '2', asset_type: 'stock', quantity: 1, avg_entry_price: 1 },
      { onConflict: 'user_id,symbol' });
    R['positions.upsert(onConflict user_id,symbol)'] =
      error ? { ok: false, error: error.message, hint: error.hint || null, code: error.code || null } : { ok: true };
  }

  // 4. transactions insert with trade type — CHECK constraint on `type` is the usual culprit
  {
    const { error } = await sb.from('transactions').insert(
      { user_id: userId, type: 'buy', status: 'completed', amount: 1, currency: 'USD',
        symbol: SYM, quantity: 1, price: 1, description: 'writetest', metadata: {} });
    R["transactions.insert(type='buy')"] =
      error ? { ok: false, error: error.message, hint: error.hint || null, code: error.code || null } : { ok: true };
  }

  // 5. transactions with a known-safe type, to isolate whether `type` is the problem
  {
    const { error } = await sb.from('transactions').insert(
      { user_id: userId, type: 'deposit', status: 'completed', amount: 1, currency: 'USD', description: 'writetest2' });
    R["transactions.insert(type='deposit')"] =
      error ? { ok: false, error: error.message } : { ok: true };
  }

  // 6. user_trading_data upsert
  {
    const { error } = await sb.from('user_trading_data').upsert(
      { user_id: userId, spot_crypto_state: { positions: [] }, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' });
    R['user_trading_data.upsert'] = error ? { ok: false, error: error.message } : { ok: true };
  }

  // cleanup
  await sb.from('crypto_positions').delete().eq('user_id', userId).eq('symbol', SYM);
  await sb.from('positions').delete().eq('user_id', userId).in('symbol', [SYM, SYM + '2']);
  await sb.from('transactions').delete().eq('user_id', userId).in('description', ['writetest', 'writetest2']);

  const failing = Object.entries(R).filter(([, v]: any) => !v.ok).map(([k]) => k);
  return NextResponse.json({
    allOk: failing.length === 0,
    failing,
    hint: failing.length
      ? 'Run sql/FIX_WRITES.sql — these writes are failing silently in the buy flow.'
      : 'All writes succeed. If positions still do not appear, the issue is read-side or user-id mismatch.',
    results: R,
  });
}
