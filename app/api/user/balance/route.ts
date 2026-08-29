/**
 * GET /api/user/balance?userId=... — authoritative balance, service role
 * (client reads are blocked by RLS under custom auth).
 */
import { NextRequest, NextResponse } from 'next/server';
import { jsonNoStore } from '@/lib/no-store';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonNoStore({ ok: false }, { status: 503 });
  const userId = new URL(req.url).searchParams.get('userId') || '';
  if (!userId) return jsonNoStore({ ok: true, balance_available: 0 });

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await sb
    .from('users')
    .select('balance_available, balance_bonus')
    .eq('id', userId)
    .maybeSingle();

  return jsonNoStore({
    ok: true,
    balance_available: Number(data?.balance_available) || 0,
    balance_bonus: Number(data?.balance_bonus) || 0,
  });
}
