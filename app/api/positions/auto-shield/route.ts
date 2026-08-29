/**
 * POST /api/positions/auto-shield   { userId, prices: { SYMBOL: number } }
 *
 * For every holding with auto-shield on, compares the current price to its
 * floor/ceiling and flips Shield automatically:
 *   price <= shield_on_below   -> Shield ON  (protect from further drop)
 *   price >= shield_off_above  -> Shield OFF (return to the market)
 * Works for stocks (positions) and crypto (crypto_positions). Prices are
 * supplied by the caller so they match exactly what the user sees.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  return supabaseAdmin();
}
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });

  const { userId, prices } = await req.json().catch(() => ({} as any));
  if (!userId) return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });
  const priceMap: Record<string, number> = prices || {};
  const changes: any[] = [];

  for (const table of ['positions', 'crypto_positions']) {
    const { data: rows } = await sb.from(table).select('*').eq('user_id', userId).eq('auto_shield_enabled', true);
    for (const r of rows || []) {
      const sym = String((r as any).symbol || '').toUpperCase();
      const price = num(priceMap[sym]);
      if (price <= 0) continue;
      const floor = num((r as any).shield_on_below);
      const ceil = num((r as any).shield_off_above);
      const on = !!(r as any).shield_enabled;

      let next = on;
      if (floor > 0 && price <= floor && !on) next = true;        // dropped to floor -> shield
      else if (ceil > 0 && price >= ceil && on) next = false;     // recovered to ceiling -> unshield

      if (next !== on) {
        await sb.from(table).update({
          shield_enabled: next,
          shield_activated_at: next ? new Date().toISOString() : null,
        }).eq('user_id', userId).eq('symbol', sym);

        await sb.from('notifications').insert({
          user_id: userId, type: 'shield',
          title: next ? `🛡️ ${sym} auto-shielded` : `${sym} auto-unshielded`,
          message: next
            ? `${sym} hit $${floor} — moved to your stable store to protect its value.`
            : `${sym} recovered to $${ceil} — returned to the market.`,
          metadata: { symbol: sym, price, shielded: next, auto: true },
        }).then(() => {}, () => {});

        changes.push({ symbol: sym, shielded: next, price });
      }
    }
  }

  return NextResponse.json({ ok: true, changes });
}
