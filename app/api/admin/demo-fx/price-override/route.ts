/**
 * ADMIN DEMO FX MANUAL PRICE OVERRIDE
 * POST - Set bid/ask directly, switch to manual mode
 *
 * Full pipeline:
 *   1. Stop any running scenario
 *   2. Update pair prices + increment seq
 *   3. Insert tick into demo_fx_ticks
 *   4. Upsert candles in demo_fx_candles (1m + 5m)
 *   5. Reprice all open trades (SL/TP/liquidation + balance return)
 *   6. Log to price_log + audit
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  appendDemoTickAndCandles,
  repriceOpenDemoTradesForPair,
  seedHistoricalCandles,
} from '@/lib/demo-fx/reprice-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: any = {};
  try { body = await req.json(); } catch {}

  const { pair_id, bid, ask } = body;
  if (!pair_id) return NextResponse.json({ error: 'Missing pair_id' }, { status: 400 });
  if (typeof bid !== 'number' || bid <= 0) return NextResponse.json({ error: 'Invalid bid' }, { status: 400 });
  if (typeof ask !== 'number' || ask <= 0) return NextResponse.json({ error: 'Invalid ask' }, { status: 400 });
  if (ask < bid) return NextResponse.json({ error: 'ask must be >= bid' }, { status: 400 });

  const now = new Date().toISOString();

  // Fetch current pair state for seq + session info
  const { data: currentPair } = await auth.supabaseAdmin
    .from('demo_fx_pairs')
    .select('active_session_id, seq')
    .eq('id', pair_id)
    .maybeSingle();

  const currentSeq = Number(currentPair?.seq || 0);
  const nextSeq = currentSeq + 1;
  const sessionId = currentPair?.active_session_id || null;

  // If there's a running scenario on this pair, stop it
  if (currentPair?.active_session_id) {
    await auth.supabaseAdmin
      .from('demo_fx_scenarios')
      .update({ status: 'stopped', completed_at: now })
      .eq('id', currentPair.active_session_id)
      .in('status', ['running', 'paused']);
  }

  // Update pair to manual with new prices + incremented seq
  const { data: updated, error } = await auth.supabaseAdmin
    .from('demo_fx_pairs')
    .update({
      current_bid: bid,
      current_ask: ask,
      mode: 'manual',
      active_session_id: null,
      price_updated_at: now,
      seq: nextSeq,
    })
    .eq('id', pair_id)
    .select('*')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Seed historical candles if chart is empty (first override)
  await seedHistoricalCandles(auth.supabaseAdmin, pair_id, sessionId, bid, ask);

  // Insert tick + upsert candles
  const tickResult = await appendDemoTickAndCandles(
    auth.supabaseAdmin,
    pair_id,
    sessionId,
    bid,
    ask,
    nextSeq,
    'manual'
  );

  // Log to price_log
  try {
    await auth.supabaseAdmin
      .from('demo_fx_price_log')
      .insert({ pair_id, bid, ask, source: 'manual', logged_at: now });
  } catch {}

  // Reprice all open trades (with SL/TP/liquidation + balance return)
  const tradeResults = await repriceOpenDemoTradesForPair(
    auth.supabaseAdmin,
    pair_id,
    bid,
    ask
  );

  // Audit
  try {
    await auth.supabaseAdmin.from('admin_audit_log').insert({
      admin_id: auth.adminId,
      action: 'demo_fx_price_override',
      meta: {
        pair_id,
        bid,
        ask,
        seq: nextSeq,
        tick_ok: tickResult.tickOk,
        trades_repriced: tradeResults.length,
        trades_closed: tradeResults.filter(r => r.closed).length,
      },
      created_at: now,
    });
  } catch {}

  return NextResponse.json({
    pair: updated,
    seq: nextSeq,
    trades_repriced: tradeResults.length,
    trades_closed: tradeResults.filter(r => r.closed).map(r => ({
      trade_id: r.trade_id,
      reason: r.close_reason,
      final_pnl: r.final_pnl,
      return_amount: r.return_amount,
    })),
  });
}
