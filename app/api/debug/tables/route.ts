/**
 * GET /api/debug/tables — checks that every table/column the trading flow
 * writes to actually exists. Open this after running the fix SQL.
 * ok:false on any row means that write is silently failing in production.
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  return supabaseAdmin();
}

export async function GET() {
  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'service role not configured' }, { status: 503 });

  const checks: Record<string, any> = {};
  const probe = async (label: string, table: string, cols: string) => {
    const { error } = await sb.from(table).select(cols).limit(1);
    checks[label] = error ? { ok: false, error: error.message } : { ok: true };
  };

  await probe('positions (stock holdings)', 'positions', 'id, user_id, symbol, quantity, avg_entry_price, shield_enabled');
  await probe('orders (stock audit)', 'orders', 'id, user_id, symbol, side');
  await probe('crypto_positions', 'crypto_positions', 'id, user_id, symbol, quantity, avg_buy_price');
  await probe('crypto_positions.shield', 'crypto_positions', 'shield_enabled');
  await probe('user_trading_data.spot_crypto_state', 'user_trading_data', 'user_id, spot_crypto_state');
  await probe('transactions (history)', 'transactions', 'id, user_id, type, amount');
  await probe('transactions.symbol/qty/price', 'transactions', 'symbol, quantity, price');
  await probe('notifications', 'notifications', 'id, user_id, type, title');

  const failing = Object.entries(checks).filter(([, v]: any) => !v.ok).map(([k]) => k);
  return NextResponse.json({
    allOk: failing.length === 0,
    failing,
    hint: failing.length ? 'Run sql/FIX_TRADING_PERSISTENCE.sql in the Supabase SQL editor.' : 'All trading tables present.',
    checks,
  });
}
