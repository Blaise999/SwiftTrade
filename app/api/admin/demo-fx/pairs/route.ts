/**
 * ADMIN DEMO FX PAIRS API
 * GET  - List all demo FX pairs
 * POST - Update a pair (mode, prices, etc.)
 *
 * When bid/ask are updated:
 *   1. Increment seq
 *   2. Insert tick into demo_fx_ticks
 *   3. Upsert candles in demo_fx_candles
 *   4. Reprice all open trades (SL/TP/liquidation + balance return)
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

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: pairs, error } = await auth.supabaseAdmin
    .from('demo_fx_pairs')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ pairs });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const { pair_id, ...updates } = body;
  if (!pair_id) {
    return NextResponse.json({ error: 'Missing pair_id' }, { status: 400 });
  }

  // Track if bid/ask are being changed (triggers tick + reprice)
  const priceChanging =
    updates.current_bid !== undefined || updates.current_ask !== undefined;

  const allowed: Record<string, any> = {};

  if (updates.mode !== undefined) {
    allowed.mode = updates.mode;
  }

  if (updates.current_bid !== undefined) {
    allowed.current_bid = Number(updates.current_bid);
    allowed.price_updated_at = new Date().toISOString();
  }

  if (updates.current_ask !== undefined) {
    allowed.current_ask = Number(updates.current_ask);
    allowed.price_updated_at = new Date().toISOString();
  }

  if (updates.spread !== undefined) {
    allowed.spread = Number(updates.spread);
  }

  if (updates.is_active !== undefined) {
    allowed.is_active = updates.is_active;
  }

  if (updates.active_scenario_id !== undefined) {
    allowed.active_scenario_id = updates.active_scenario_id || null;
  }

  if (updates.rare_pair_symbol !== undefined) {
    allowed.rare_pair_symbol = updates.rare_pair_symbol || null;
  }

  if (updates.rare_pair_name !== undefined) {
    allowed.rare_pair_name = updates.rare_pair_name || null;
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // If price is changing, fetch current pair to get seq and session info
  let currentSeq = 0;
  let sessionId: string | null = null;

  if (priceChanging) {
    const { data: currentPair } = await auth.supabaseAdmin
      .from('demo_fx_pairs')
      .select('seq, active_session_id, current_bid, current_ask')
      .eq('id', pair_id)
      .maybeSingle();

    currentSeq = Number(currentPair?.seq || 0);
    sessionId = currentPair?.active_session_id || null;

    // Increment seq
    allowed.seq = currentSeq + 1;

    // Fill in missing bid/ask from current values for tick insertion
    if (allowed.current_bid === undefined && currentPair) {
      allowed.current_bid = Number(currentPair.current_bid);
    }
    if (allowed.current_ask === undefined && currentPair) {
      allowed.current_ask = Number(currentPair.current_ask);
    }
  }

  // Update the pair
  const { data: pair, error } = await auth.supabaseAdmin
    .from('demo_fx_pairs')
    .update(allowed)
    .eq('id', pair_id)
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // If price changed: insert tick, build candles, reprice trades
  let tradeResults: any[] = [];

  if (priceChanging && allowed.current_bid > 0 && allowed.current_ask > 0) {
    // Seed historical candles if chart is empty
    await seedHistoricalCandles(auth.supabaseAdmin, pair_id, sessionId, allowed.current_bid, allowed.current_ask);

    // Insert tick + upsert candles
    await appendDemoTickAndCandles(
      auth.supabaseAdmin,
      pair_id,
      sessionId,
      allowed.current_bid,
      allowed.current_ask,
      allowed.seq,
      'manual'
    );

    // Log to price log
    try {
      await auth.supabaseAdmin.from('demo_fx_price_log').insert({
        pair_id,
        bid: allowed.current_bid,
        ask: allowed.current_ask,
        source: 'manual',
        logged_at: new Date().toISOString(),
      });
    } catch {}

    // Reprice all open trades
    tradeResults = await repriceOpenDemoTradesForPair(
      auth.supabaseAdmin,
      pair_id,
      allowed.current_bid,
      allowed.current_ask
    );
  }

  // Audit log
  try {
    await auth.supabaseAdmin.from('admin_audit_log').insert({
      admin_id: auth.adminId,
      action: 'demo_fx_pair_update',
      meta: {
        pair_id,
        updates: allowed,
        trades_repriced: tradeResults.length,
        trades_closed: tradeResults.filter((r: any) => r.closed).length,
      },
      created_at: new Date().toISOString(),
    });
  } catch {
    // intentionally ignore audit log failures
  }

  return NextResponse.json({
    pair,
    trades_repriced: tradeResults.length,
    trades_closed: tradeResults.filter((r: any) => r.closed).map((r: any) => ({
      trade_id: r.trade_id,
      reason: r.close_reason,
      final_pnl: r.final_pnl,
    })),
  });
}
