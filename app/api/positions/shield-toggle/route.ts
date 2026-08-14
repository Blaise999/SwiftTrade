/**
 * POST /api/positions/shield-toggle
 *   { userId, symbol, kind, enabled, positionValue }
 *
 * Flips Shield on a holding (stocks -> positions, crypto -> crypto_positions).
 * MONETIZATION: activating Shield charges a small "insurance premium" — a % of
 * the protected position value — deducted from the user's balance. Un-shielding
 * is free. The fee is refused if the balance can't cover it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Shield premium — 1% of the position value per activation. Tune here.
export const SHIELD_FEE_PCT = 0.01;

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

  const { userId, symbol, kind, enabled, positionValue } = await req.json().catch(() => ({} as any));
  if (!userId || !symbol) return NextResponse.json({ ok: false, error: 'userId and symbol required' }, { status: 400 });

  const sym = String(symbol).toUpperCase();
  const table = kind === 'crypto' ? 'crypto_positions' : 'positions';

  // ── Shield fee on activation ──
  let fee = 0;
  if (enabled) {
    fee = Math.max(0, num(positionValue) * SHIELD_FEE_PCT);
    if (fee > 0) {
      const { data: u } = await sb.from('users').select('balance_available').eq('id', userId).maybeSingle();
      const bal = num(u?.balance_available);
      if (bal < fee) {
        return NextResponse.json({
          ok: false, error: `Shield fee is $${fee.toFixed(2)} (${(SHIELD_FEE_PCT * 100).toFixed(0)}% of value). Your balance is $${bal.toFixed(2)}.`,
          code: 'INSUFFICIENT_FOR_FEE', fee,
        }, { status: 400 });
      }
      await sb.from('users').update({ balance_available: bal - fee, updated_at: new Date().toISOString() }).eq('id', userId);
      await sb.from('transactions').insert({
        user_id: userId, type: 'fee', status: 'completed', amount: fee, currency: 'USD',
        description: `Shield premium for ${sym}`, metadata: { symbol: sym, kind, pct: SHIELD_FEE_PCT },
      }).then(() => {}, () => {});
    }
  }

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
      ? `${sym} moved to your stable store — value locked.${fee > 0 ? ` Shield premium: $${fee.toFixed(2)}.` : ''}`
      : `${sym} returned to the market — now tracking live prices again.`,
    metadata: { symbol: sym, shielded: !!enabled, fee },
  }).then(() => {}, () => {});

  return NextResponse.json({ ok: true, symbol: sym, shielded: !!enabled, fee });
}
