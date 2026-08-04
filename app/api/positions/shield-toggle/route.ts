/**
 * POST /api/positions/shield-toggle   { userId, symbol, kind, enabled }
 * Flips Shield on a single holding — stocks -> positions, crypto -> crypto_positions.
 * Records shield_activated_at and fires a notification.
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

export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });

  const { userId, symbol, kind, enabled } = await req.json().catch(() => ({} as any));
  if (!userId || !symbol) return NextResponse.json({ ok: false, error: 'userId and symbol required' }, { status: 400 });

  const sym = String(symbol).toUpperCase();
  const table = kind === 'crypto' ? 'crypto_positions' : 'positions';
  const { error } = await sb.from(table).update({
    shield_enabled: !!enabled,
    shield_activated_at: enabled ? new Date().toISOString() : null,
  }).eq('user_id', userId).eq('symbol', sym);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await sb.from('notifications').insert({
    user_id: userId,
    type: 'shield',
    title: enabled ? `🛡️ ${sym} shielded` : `${sym} unshielded`,
    message: enabled
      ? `${sym} moved to your stable store — its value is locked and protected from the market.`
      : `${sym} returned to the market — now tracking live prices again.`,
    metadata: { symbol: sym, shielded: !!enabled },
  }).then(() => {}, () => {});

  return NextResponse.json({ ok: true, symbol: sym, shielded: !!enabled });
}
