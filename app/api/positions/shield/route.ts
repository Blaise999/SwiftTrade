/**
 * POST /api/positions/shield   { userId, symbol, enabled }
 * Toggles Shield on a single stock/ETF holding (positions.shield_enabled).
 * Crypto shield goes through PATCH /api/portfolio; this is the equities twin.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  return supabaseAdmin();
}

export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });

  const { userId, symbol, enabled } = await req.json().catch(() => ({} as any));
  if (!userId || !symbol) {
    return NextResponse.json({ ok: false, error: 'userId and symbol required' }, { status: 400 });
  }

  const patch: any = { shield_enabled: !!enabled };
  if (enabled) patch.shield_activated_at = new Date().toISOString();

  const { error } = await sb
    .from('positions')
    .update(patch)
    .eq('user_id', userId)
    .eq('symbol', String(symbol).toUpperCase());

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, symbol: String(symbol).toUpperCase(), enabled: !!enabled });
}
