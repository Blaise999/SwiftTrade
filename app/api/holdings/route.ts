/**
 * GET /api/holdings?userId=...&market=crypto
 *
 * Returns crypto holdings from where the app ACTUALLY stores them:
 * user_trading_data.spot_crypto_state.positions (written by the spot store).
 * This is the same data the crypto trade page shows, so portfolio/dashboard
 * finally match it. Read-only; uses the service role (bypasses RLS).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });
  const userId = new URL(req.url).searchParams.get('userId') || req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });

  const { data } = await sb
    .from('user_trading_data')
    .select('spot_crypto_state')
    .eq('user_id', userId)
    .maybeSingle();

  const positions = (data?.spot_crypto_state as any)?.positions || [];
  const holdings = positions
    .map((p: any) => {
      const qty = num(p.quantity);
      const avg = num(p.avgBuyPrice ?? p.avgPrice ?? p.averagePrice);
      return { symbol: String(p.symbol || '').toUpperCase(), name: p.name, quantity: qty, avgPrice: avg, value: qty * avg };
    })
    .filter((h: any) => h.symbol && h.quantity > 1e-9);

  return NextResponse.json({ ok: true, holdings });
}
