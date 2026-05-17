/**
 * SESSION TICK ENGINE
 * POST /api/admin/demo-fx/session-tick
 *
 * Called every ~1s by the admin dashboard.
 *
 * What this version fixes:
 * 1. Uses pair.seq as the GLOBAL per-pair sequence
 * 2. Uses session.tick_seq as LOCAL session-only progress
 * 3. Never resets pair seq when a session is running
 * 4. Leaves final pair state intact when session completes
 * 5. Removes background idle ticking from here
 *    (cron/autopilot is the only idle/background writer)
 * 6. Makes pair claiming race-safe
 * 7. Uses optimistic locking on pair seq to reduce double-tick overlap
 * 8. Best-effort rolls pair state back if tick/candle write fails after pair update
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import {
  computeSessionElapsed,
  computeProgress,
} from '@/lib/demo-fx/session-engine';
import { getNextTickFromPlanner, clearPlannerCache } from '@/lib/demo-fx/candle-planner';
import {
  appendDemoTickAndCandles,
  repriceOpenDemoTradesForPair,
} from '@/lib/demo-fx/reprice-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PairRow = {
  id: string;
  current_bid: number | null;
  current_ask: number | null;
  spread: number | null;
  seq: number | null;
  active_session_id: string | null;
};

async function safeInsertPriceLog(
  supabaseAdmin: any,
  row: {
    pair_id: string;
    bid: number;
    ask: number;
    source: 'session';
    logged_at: string;
  }
) {
  try {
    const { error } = await supabaseAdmin.from('demo_fx_price_log').insert(row);

    if (error) {
      console.error('[session-tick] demo_fx_price_log insert failed:', error.message);
    }
  } catch (err) {
    console.error('[session-tick] demo_fx_price_log insert crashed:', err);
  }
}

async function fetchPair(supabaseAdmin: any, pairId: string): Promise<{ pair: PairRow | null; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from('demo_fx_pairs')
    .select('id, current_bid, current_ask, spread, seq, active_session_id')
    .eq('id', pairId)
    .maybeSingle();

  if (error) {
    return { pair: null, error: error.message };
  }

  return { pair: (data as PairRow | null) ?? null };
}

async function claimPairForSession(
  supabaseAdmin: any,
  pairId: string,
  sessionId: string
): Promise<
  | { ok: true; pair: PairRow }
  | { ok: false; step: string; error: string }
> {
  const initial = await fetchPair(supabaseAdmin, pairId);

  if (initial.error || !initial.pair) {
    return {
      ok: false,
      step: 'fetch_pair',
      error: initial.error || 'Pair not found',
    };
  }

  if (initial.pair.active_session_id && initial.pair.active_session_id !== sessionId) {
    return {
      ok: false,
      step: 'ownership',
      error: 'Pair is controlled by a different session',
    };
  }

  if (initial.pair.active_session_id === sessionId) {
    return { ok: true, pair: initial.pair };
  }

  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('demo_fx_pairs')
    .update({
      mode: 'session',
      active_session_id: sessionId,
    })
    .eq('id', pairId)
    .is('active_session_id', null)
    .select('id, current_bid, current_ask, spread, seq, active_session_id')
    .maybeSingle();

  if (claimError) {
    return {
      ok: false,
      step: 'claim_pair',
      error: claimError.message,
    };
  }

  if (claimed) {
    return { ok: true, pair: claimed as PairRow };
  }

  const afterClaim = await fetchPair(supabaseAdmin, pairId);

  if (afterClaim.error || !afterClaim.pair) {
    return {
      ok: false,
      step: 'claim_refetch',
      error: afterClaim.error || 'Pair disappeared after claim attempt',
    };
  }

  if (afterClaim.pair.active_session_id !== sessionId) {
    return {
      ok: false,
      step: 'claim_conflict',
      error: 'Pair was claimed by another session while processing',
    };
  }

  return { ok: true, pair: afterClaim.pair };
}

async function updatePairQuoteWithSeqGuard(
  supabaseAdmin: any,
  args: {
    pairId: string;
    sessionId: string;
    expectedSeq: number;
    bid: number;
    ask: number;
    priceUpdatedAt: string;
  }
): Promise<
  | { ok: true; pair: PairRow }
  | { ok: false; step: string; error: string }
> {
  const { data, error } = await supabaseAdmin
    .from('demo_fx_pairs')
    .update({
      current_bid: args.bid,
      current_ask: args.ask,
      seq: args.expectedSeq + 1,
      price_updated_at: args.priceUpdatedAt,
    })
    .eq('id', args.pairId)
    .eq('active_session_id', args.sessionId)
    .eq('seq', args.expectedSeq)
    .select('id, current_bid, current_ask, spread, seq, active_session_id')
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      step: 'update_pair',
      error: error.message,
    };
  }

  if (!data) {
    return {
      ok: false,
      step: 'update_pair_conflict',
      error: 'Pair seq changed before update completed',
    };
  }

  return { ok: true, pair: data as PairRow };
}

async function rollbackPairQuote(
  supabaseAdmin: any,
  args: {
    pairId: string;
    sessionId: string;
    rollbackFromSeq: number;
    bid: number;
    ask: number;
  }
): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('demo_fx_pairs')
      .update({
        current_bid: args.bid,
        current_ask: args.ask,
        seq: args.rollbackFromSeq - 1,
      })
      .eq('id', args.pairId)
      .eq('active_session_id', args.sessionId)
      .eq('seq', args.rollbackFromSeq)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('[session-tick] rollback failed:', error.message);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('[session-tick] rollback crashed:', err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const results: any[] = [];

  const { data: sessions, error: sessionsError } = await auth.supabaseAdmin
    .from('demo_fx_sessions')
    .select('*')
    .eq('status', 'running');

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 400 });
  }

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ tick: true, results: [], running: 0 });
  }

  for (const session of sessions) {
    const tickTimeIso = new Date().toISOString();

    const pairClaim = await claimPairForSession(auth.supabaseAdmin, session.pair_id, session.id);

    if (!pairClaim.ok) {
      results.push({
        event: 'error',
        session_id: session.id,
        pair_id: session.pair_id,
        step: pairClaim.step,
        error: pairClaim.error,
      });
      continue;
    }

    const pair = pairClaim.pair;

    const currentPairSeq = Number(pair.seq || 0);
    const nextPairSeq = currentPairSeq + 1;
    const currentSessionTickSeq = Number(session.tick_seq || 0);
    const nextSessionTickSeq = currentSessionTickSeq + 1;

    const elapsedMs = computeSessionElapsed(session);
    const progress = computeProgress(elapsedMs, session.duration_ms);

    if (progress >= 1) {
      const targetBid = Number(session.target_bid);
      const targetAsk = Number(session.target_ask);

      if (!(targetBid > 0) || !(targetAsk > 0)) {
        results.push({
          event: 'error',
          session_id: session.id,
          pair_id: session.pair_id,
          step: 'complete_validation',
          error: 'Invalid target bid/ask',
        });
        continue;
      }

      const pairUpdate = await updatePairQuoteWithSeqGuard(auth.supabaseAdmin, {
        pairId: session.pair_id,
        sessionId: session.id,
        expectedSeq: currentPairSeq,
        bid: targetBid,
        ask: targetAsk,
        priceUpdatedAt: tickTimeIso,
      });

      if (!pairUpdate.ok) {
        results.push({
          event: 'error',
          session_id: session.id,
          pair_id: session.pair_id,
          step: pairUpdate.step,
          error: pairUpdate.error,
        });
        continue;
      }

      const tickResult = await appendDemoTickAndCandles(
        auth.supabaseAdmin,
        session.pair_id,
        session.id,
        targetBid,
        targetAsk,
        nextPairSeq,
        'session'
      );

      if (!tickResult.tickOk) {
        const rolledBack = await rollbackPairQuote(auth.supabaseAdmin, {
          pairId: session.pair_id,
          sessionId: session.id,
          rollbackFromSeq: nextPairSeq,
          bid: Number(pair.current_bid || session.start_bid),
          ask: Number(pair.current_ask || session.start_ask),
        });

        results.push({
          event: 'error',
          session_id: session.id,
          pair_id: session.pair_id,
          step: 'complete_tick',
          error: tickResult.candleErrors.join(' | ') || 'Tick/candle write failed',
          pair_rolled_back: rolledBack,
        });
        continue;
      }

      const tradeResults = await repriceOpenDemoTradesForPair(
        auth.supabaseAdmin,
        session.pair_id,
        targetBid,
        targetAsk
      );

      const { data: completedSession, error: completeSessionError } = await auth.supabaseAdmin
        .from('demo_fx_sessions')
        .update({
          status: 'completed',
          completed_at: tickTimeIso,
          paused_at: null,
          elapsed_ms: Number(session.duration_ms || 0),
          tick_seq: nextSessionTickSeq,
        })
        .eq('id', session.id)
        .eq('status', 'running')
        .eq('tick_seq', currentSessionTickSeq)
        .select('id')
        .maybeSingle();

      if (completeSessionError) {
        results.push({
          event: 'error',
          session_id: session.id,
          pair_id: session.pair_id,
          step: 'complete_session',
          error: completeSessionError.message,
        });
        continue;
      }

      if (!completedSession) {
        results.push({
          event: 'error',
          session_id: session.id,
          pair_id: session.pair_id,
          step: 'complete_session_conflict',
          error: 'Session state changed before completion update',
        });
        continue;
      }

      const { error: completePairError } = await auth.supabaseAdmin
        .from('demo_fx_pairs')
        .update({
          mode: 'autopilot',
          active_session_id: null,
        })
        .eq('id', session.pair_id)
        .eq('active_session_id', session.id);

      if (completePairError) {
        results.push({
          event: 'error',
          session_id: session.id,
          pair_id: session.pair_id,
          step: 'complete_pair_release',
          error: completePairError.message,
        });
        continue;
      }

      await safeInsertPriceLog(auth.supabaseAdmin, {
        pair_id: session.pair_id,
        bid: targetBid,
        ask: targetAsk,
        source: 'session',
        logged_at: tickTimeIso,
      });

      clearPlannerCache(session.id, session.pair_id);

      results.push({
        event: 'completed',
        session_id: session.id,
        pair_id: session.pair_id,
        pair_seq: nextPairSeq,
        session_tick_seq: nextSessionTickSeq,
        bid: targetBid,
        ask: targetAsk,
        trades_repriced: tradeResults.length,
        trades_closed: tradeResults.filter((t: any) => t.closed).length,
      });

      for (const trade of tradeResults.filter((t: any) => t.closed)) {
        results.push({
          event: 'trade_closed',
          trade_id: trade.trade_id,
          reason: trade.close_reason,
          final_pnl: trade.final_pnl,
        });
      }

      continue;
    }

    const prevBid = Number(pair.current_bid || session.start_bid);
    const prevAsk = Number(pair.current_ask || session.start_ask);
    const prevClose = (prevBid + prevAsk) / 2;

    const pairSpread = Math.max(
      Math.abs(Number(session.start_ask) - Number(session.start_bid)),
      Math.max(0, prevAsk - prevBid),
      prevClose * 0.00008
    );

    const plannerResult = getNextTickFromPlanner(
      session.id,
      session.pair_id,
      session.session_type,
      progress,
      prevClose,
      Number(session.volatility) || 0.0008,
      (Number(session.start_bid) + Number(session.start_ask)) / 2,
      (Number(session.target_bid) + Number(session.target_ask)) / 2,
      nextSessionTickSeq
    );

    const mid = Number(plannerResult.mid);
    const bid = Number((mid - pairSpread / 2).toFixed(6));
    const ask = Number((mid + pairSpread / 2).toFixed(6));

    const pairUpdate = await updatePairQuoteWithSeqGuard(auth.supabaseAdmin, {
      pairId: session.pair_id,
      sessionId: session.id,
      expectedSeq: currentPairSeq,
      bid,
      ask,
      priceUpdatedAt: tickTimeIso,
    });

    if (!pairUpdate.ok) {
      results.push({
        event: 'error',
        session_id: session.id,
        pair_id: session.pair_id,
        step: pairUpdate.step,
        error: pairUpdate.error,
      });
      continue;
    }

    const tickResult = await appendDemoTickAndCandles(
      auth.supabaseAdmin,
      session.pair_id,
      session.id,
      bid,
      ask,
      nextPairSeq,
      'session'
    );

    if (!tickResult.tickOk) {
      const rolledBack = await rollbackPairQuote(auth.supabaseAdmin, {
        pairId: session.pair_id,
        sessionId: session.id,
        rollbackFromSeq: nextPairSeq,
        bid: prevBid,
        ask: prevAsk,
      });

      results.push({
        event: 'error',
        session_id: session.id,
        pair_id: session.pair_id,
        step: 'tick_write',
        error: tickResult.candleErrors.join(' | ') || 'Tick/candle write failed',
        pair_rolled_back: rolledBack,
      });
      continue;
    }

    const { data: updatedSession, error: sessionSeqError } = await auth.supabaseAdmin
      .from('demo_fx_sessions')
      .update({ tick_seq: nextSessionTickSeq })
      .eq('id', session.id)
      .eq('status', 'running')
      .eq('tick_seq', currentSessionTickSeq)
      .select('id')
      .maybeSingle();

    if (sessionSeqError) {
      results.push({
        event: 'error',
        session_id: session.id,
        pair_id: session.pair_id,
        step: 'update_session_seq',
        error: sessionSeqError.message,
      });
      continue;
    }

    if (!updatedSession) {
      results.push({
        event: 'error',
        session_id: session.id,
        pair_id: session.pair_id,
        step: 'update_session_seq_conflict',
        error: 'Session tick_seq changed before update completed',
      });
      continue;
    }

    if (nextSessionTickSeq % 3 === 0) {
      await safeInsertPriceLog(auth.supabaseAdmin, {
        pair_id: session.pair_id,
        bid,
        ask,
        source: 'session',
        logged_at: tickTimeIso,
      });
    }

    const tradeResults = await repriceOpenDemoTradesForPair(
      auth.supabaseAdmin,
      session.pair_id,
      bid,
      ask
    );

    results.push({
      event: 'tick',
      session_id: session.id,
      pair_id: session.pair_id,
      pair_seq: nextPairSeq,
      session_tick_seq: nextSessionTickSeq,
      elapsed_ms: elapsedMs,
      progress: Number(progress.toFixed(4)),
      bid,
      ask,
      mid,
      trades_repriced: tradeResults.length,
      trades_closed: tradeResults.filter((t: any) => t.closed).length,
    });

    for (const trade of tradeResults.filter((t: any) => t.closed)) {
      results.push({
        event: 'trade_closed',
        trade_id: trade.trade_id,
        reason: trade.close_reason,
        final_pnl: trade.final_pnl,
      });
    }
  }

  return NextResponse.json({
    tick: true,
    results,
    running: sessions.length,
  });
}