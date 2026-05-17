/**
 * DEMO FX TICK ENGINE
 * POST /api/admin/demo-fx/tick
 * 
 * Called periodically (every ~500ms-1s) by the admin dashboard or a cron.
 * This is the HEARTBEAT of the scenario system:
 * 1. Check for scheduled scenarios that should auto-start
 * 2. For each running scenario, compute interpolated price
 * 3. Update pair current_bid/current_ask
 * 4. Log price history
 * 5. Update all open trades' floating PnL
 * 6. Auto-close trades on SL/TP/liquidation
 * 7. Mark completed scenarios
 * 
 * Can also be called from user-facing /api/demo-fx/prices for read-only tick.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  interpolatePrice,
  computeElapsedMs,
  isScenarioComplete,
  processOpenTrades,
} from '@/lib/demo-fx/scenario-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const now = new Date();
  const nowIso = now.toISOString();
  const results: any[] = [];

  // ─── 1) AUTO-START SCHEDULED SCENARIOS ────────────────────────────────
  const { data: scheduled } = await auth.supabaseAdmin
    .from('demo_fx_scenarios')
    .select('id, pair_id, scheduled_at')
    .eq('status', 'scheduled')
    .not('scheduled_at', 'is', null)
    .lte('scheduled_at', nowIso);

  if (scheduled && scheduled.length > 0) {
    for (const s of scheduled) {
      // Auto-start
      await auth.supabaseAdmin
        .from('demo_fx_scenarios')
        .update({
          status: 'running',
          started_at: nowIso,
          elapsed_ms: 0,
          current_step_index: 0,
        })
        .eq('id', s.id);

      await auth.supabaseAdmin
        .from('demo_fx_pairs')
        .update({
          mode: 'scenario',
          active_scenario_id: s.id,
        })
        .eq('id', s.pair_id);

      results.push({ event: 'auto_started', scenario_id: s.id });
    }
  }

  // ─── 2) PROCESS RUNNING SCENARIOS ─────────────────────────────────────
  const { data: running } = await auth.supabaseAdmin
    .from('demo_fx_scenarios')
    .select('*')
    .eq('status', 'running');

  if (!running || running.length === 0) {
    return NextResponse.json({ tick: true, results, running: 0 });
  }

  for (const scenario of running) {
    // Fetch steps
    const { data: steps } = await auth.supabaseAdmin
      .from('demo_fx_scenario_steps')
      .select('*')
      .eq('scenario_id', scenario.id)
      .order('step_index', { ascending: true });

    if (!steps || steps.length === 0) continue;

    // Compute elapsed time
    const elapsedMs = computeElapsedMs(scenario);

    // Check if scenario is complete
    const completion = isScenarioComplete(steps, elapsedMs, scenario.loop_playback);

    if (completion.complete) {
      // Mark scenario as completed
      await auth.supabaseAdmin
        .from('demo_fx_scenarios')
        .update({
          status: 'completed',
          completed_at: nowIso,
          elapsed_ms: elapsedMs,
        })
        .eq('id', scenario.id);

      // Set pair back to autopilot for seamless cron handoff
      await auth.supabaseAdmin
        .from('demo_fx_pairs')
        .update({ mode: 'autopilot', active_scenario_id: null })
        .eq('id', scenario.pair_id);

      results.push({ event: 'completed', scenario_id: scenario.id });
      continue;
    }

    // Use looped elapsed if looping
    const effectiveElapsed = completion.loopedElapsedMs ?? elapsedMs;

    // Interpolate current price
    const tick = interpolatePrice(steps, effectiveElapsed, true);
    if (!tick) continue;

    // Update pair prices
    await auth.supabaseAdmin
      .from('demo_fx_pairs')
      .update({
        current_bid: tick.bid,
        current_ask: tick.ask,
        price_updated_at: nowIso,
      })
      .eq('id', scenario.pair_id);

    // Log price (throttle: only log every ~2 seconds to avoid bloat)
    const shouldLog = Math.random() < 0.5; // ~50% chance per tick at 1s interval = ~every 2s
    if (shouldLog) {
      await auth.supabaseAdmin
        .from('demo_fx_price_log')
        .insert({
          pair_id: scenario.pair_id,
          bid: tick.bid,
          ask: tick.ask,
          source: 'scenario',
          logged_at: nowIso,
        });
    }

    // Update scenario progress
    await auth.supabaseAdmin
      .from('demo_fx_scenarios')
      .update({ current_step_index: tick.step_to })
      .eq('id', scenario.id);

    // ─── 3) PROCESS OPEN TRADES ─────────────────────────────────────────
    const { data: openTrades } = await auth.supabaseAdmin
      .from('demo_fx_trades')
      .select('*')
      .eq('pair_id', scenario.pair_id)
      .eq('status', 'open');

    if (openTrades && openTrades.length > 0) {
      const tradeUpdates = processOpenTrades(openTrades, tick.bid, tick.ask);

      for (const u of tradeUpdates) {
        if (u.should_close) {
          await auth.supabaseAdmin
            .from('demo_fx_trades')
            .update({
              status: u.close_reason === 'liquidation' ? 'liquidated' :
                      u.close_reason === 'stop_loss' ? 'stopped_out' :
                      u.close_reason === 'take_profit' ? 'take_profit' : 'closed',
              close_reason: u.close_reason,
              exit_price: u.exit_price,
              final_pnl: u.final_pnl,
              current_price: u.current_price,
              floating_pnl: u.floating_pnl,
              closed_at: nowIso,
            })
            .eq('id', u.trade_id);

          results.push({
            event: 'trade_closed',
            trade_id: u.trade_id,
            reason: u.close_reason,
            final_pnl: u.final_pnl,
          });
        } else {
          await auth.supabaseAdmin
            .from('demo_fx_trades')
            .update({
              current_price: u.current_price,
              floating_pnl: u.floating_pnl,
            })
            .eq('id', u.trade_id);
        }
      }
    }

    results.push({
      event: 'tick',
      scenario_id: scenario.id,
      pair_id: scenario.pair_id,
      elapsed_ms: elapsedMs,
      bid: tick.bid,
      ask: tick.ask,
      step: `${tick.step_from}->${tick.step_to}`,
      progress: tick.progress,
      open_trades: openTrades?.length || 0,
    });
  }

  return NextResponse.json({ tick: true, results, running: running.length });
}
