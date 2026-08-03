/**
 * POST /api/positions/shield-config   { userId, symbol, kind, enabled, floor, ceiling }
 * Saves Auto-Shield settings on a holding (stocks -> positions, crypto -> crypto_positions):
 *   floor   = shield_on_below   (shield when price drops to/under this)
 *   ceiling = shield_off_above  (un-shield when price rises to/over this)
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

export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });

  const { userId, symbol, kind, enabled, floor, ceiling } = await req.json().catch(() => ({} as any));
  if (!userId || !symbol) return NextResponse.json({ ok: false, error: 'userId and symbol required' }, { status: 400 });

  const table = kind === 'crypto' ? 'crypto_positions' : 'positions';
  const { error } = await sb.from(table).update({
    auto_shield_enabled: !!enabled,
    shield_on_below: floor != null && floor !== '' ? num(floor) : null,
    shield_off_above: ceiling != null && ceiling !== '' ? num(ceiling) : null,
  }).eq('user_id', userId).eq('symbol', String(symbol).toUpperCase());

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
