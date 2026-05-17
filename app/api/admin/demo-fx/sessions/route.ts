import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { computeSessionElapsed } from '@/lib/demo-fx/session-engine';
import { clearPlannerCache } from '@/lib/demo-fx/candle-planner';
import {
  ensurePairAutopilotFresh,
  resolvePairRuntimeState,
  toNum,
  type RuntimePairRow,
} from '@/lib/demo-fx/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PairRow = RuntimePairRow & {
  id: string;
  is_active?: boolean | null;
};

/**
 * ADMIN DEMO FX SESSIONS API
 * GET    - List all sessions
 * POST   - Create + optionally start a session
 * PUT    - Control: start/pause/resume/stop
 * DELETE - Delete a session
 */

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await auth.supabaseAdmin
    .from('demo_fx_sessions')
    .select('*, demo_fx_pairs(symbol, name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ sessions: data || [] });
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

  const {
    pair_id,
    session_type = 'bullish',
    duration_ms = 300000,
    tick_interval_ms = 1000,
    volatility = 0.0008,
    start_bid,
    start_ask,
    target_bid,
    target_ask,
    lesson_title,
    lesson_description,
    student_instructions,
    auto_start = false,
    inherit_live_start = true,
  } = body;

  if (!pair_id) {
    return NextResponse.json({ error: 'pair_id required' }, { status: 400 });
  }

  if (target_bid == null || target_ask == null) {
    return NextResponse.json({ error: 'target_bid/ask required' }, { status: 400 });
  }

  const { data: running, error: runningError } = await auth.supabaseAdmin
    .from('demo_fx_sessions')
    .select('id')
    .eq('pair_id', pair_id)
    .in('status', ['running', 'paused'])
    .limit(1);

  if (runningError) {
    return NextResponse.json({ error: runningError.message }, { status: 400 });
  }

  if (running && running.length > 0) {
    return NextResponse.json(
      { error: 'Another session is already active on this pair. Stop it first.' },
      { status: 409 }
    );
  }

  const { data: rawPair, error: pairFetchError } = await auth.supabaseAdmin
    .from('demo_fx_pairs')
    .select(
      'id, is_active, current_bid, current_ask, mode, active_session_id, seq, price_updated_at, pip_size, spread'
    )
    .eq('id', pair_id)
    .maybeSingle<PairRow>();

  if (pairFetchError || !rawPair) {
    return NextResponse.json({ error: 'Pair not found' }, { status: 404 });
  }

  if (rawPair.is_active === false) {
    return NextResponse.json({ error: 'Pair is not active' }, { status: 400 });
  }

  const resolvedPair = await resolvePairRuntimeState(auth.supabaseAdmin, rawPair);
  const livePair = await ensurePairAutopilotFresh(auth.supabaseAdmin, resolvedPair);

  const liveBid = toNum(livePair.current_bid, 0);
  const liveAsk = toNum(livePair.current_ask, 0);
  const liveSeq = toNum(livePair.seq, 0);

  const useLiveStart = inherit_live_start !== false;

  const sessionStartBid = useLiveStart ? liveBid : Number(start_bid);
  const sessionStartAsk = useLiveStart ? liveAsk : Number(start_ask);

  if (!(sessionStartBid > 0) || !(sessionStartAsk > 0)) {
    return NextResponse.json(
      { error: 'Could not resolve valid start_bid/start_ask' },
      { status: 400 }
    );
  }

  if (!(Number(target_bid) > 0) || !(Number(target_ask) > 0)) {
    return NextResponse.json({ error: 'Invalid target_bid/target_ask' }, { status: 400 });
  }

  const now = new Date().toISOString();

  const insertData: any = {
    pair_id,
    session_type,
    duration_ms: Number(duration_ms),
    tick_interval_ms: Number(tick_interval_ms),
    volatility: Number(volatility),
    start_bid: Number(sessionStartBid),
    start_ask: Number(sessionStartAsk),
    target_bid: Number(target_bid),
    target_ask: Number(target_ask),
    status: auto_start ? 'running' : 'pending',
    started_at: auto_start ? now : null,
    elapsed_ms: 0,
    tick_seq: 0,
    lesson_title: lesson_title || null,
    lesson_description: lesson_description || null,
    student_instructions: student_instructions || null,
    created_by: auth.adminId,
  };

  const { data: session, error: sessionError } = await auth.supabaseAdmin
    .from('demo_fx_sessions')
    .insert(insertData)
    .select('*')
    .single();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 400 });
  }

  if (auto_start && session) {
    try {
      await auth.supabaseAdmin
        .from('demo_fx_candles')
        .delete()
        .eq('pair_id', pair_id)
        .not('session_id', 'is', null);

      await auth.supabaseAdmin
        .from('demo_fx_ticks')
        .delete()
        .eq('pair_id', pair_id)
        .not('session_id', 'is', null);
    } catch {}

    const { error: pairError } = await auth.supabaseAdmin
      .from('demo_fx_pairs')
      .update({
        mode: 'session',
        active_session_id: session.id,
        current_bid: Number(sessionStartBid),
        current_ask: Number(sessionStartAsk),
        seq: liveSeq,
        price_updated_at: now,
      })
      .eq('id', pair_id);

    if (pairError) {
      return NextResponse.json({ error: pairError.message }, { status: 400 });
    }

    try {
      const { seedHistoricalCandles } = await import('@/lib/demo-fx/reprice-helpers');
      await seedHistoricalCandles(
        auth.supabaseAdmin,
        pair_id,
        session.id,
        Number(sessionStartBid),
        Number(sessionStartAsk)
      );
    } catch {}
  }

  return NextResponse.json(
    {
      session,
      live_pair: {
        bid: liveBid,
        ask: liveAsk,
        seq: liveSeq,
      },
    },
    { status: 201 }
  );
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const { session_id, action } = body;

  if (!session_id || !action) {
    return NextResponse.json({ error: 'session_id + action required' }, { status: 400 });
  }

  const { data: session, error: fetchErr } = await auth.supabaseAdmin
    .from('demo_fx_sessions')
    .select('*')
    .eq('id', session_id)
    .maybeSingle();

  if (fetchErr || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  let updates: any = {};
  let pairUpdates: any = {};
  let shouldSeedSessionHistory = false;
  let sessionSeedBid = 0;
  let sessionSeedAsk = 0;

  switch (action) {
    case 'start': {
      if (session.status === 'running') {
        return NextResponse.json({ error: 'Already running' }, { status: 400 });
      }

      const { data: rawPair, error: pairFetchError } = await auth.supabaseAdmin
        .from('demo_fx_pairs')
        .select(
          'id, current_bid, current_ask, mode, active_session_id, seq, price_updated_at, pip_size, spread'
        )
        .eq('id', session.pair_id)
        .maybeSingle<PairRow>();

      if (pairFetchError || !rawPair) {
        return NextResponse.json({ error: 'Pair not found' }, { status: 404 });
      }

      const resolvedPair = await resolvePairRuntimeState(auth.supabaseAdmin, rawPair);
      const livePair = await ensurePairAutopilotFresh(auth.supabaseAdmin, resolvedPair);

      const liveBid = toNum(livePair.current_bid, toNum(session.start_bid, 0));
      const liveAsk = toNum(livePair.current_ask, toNum(session.start_ask, 0));
      const liveSeq = toNum(livePair.seq, 0);

      updates = {
        status: 'running',
        started_at: now,
        paused_at: null,
        completed_at: null,
        elapsed_ms: 0,
        tick_seq: 0,
        start_bid: liveBid,
        start_ask: liveAsk,
      };

      pairUpdates = {
        mode: 'session',
        active_session_id: session_id,
        current_bid: liveBid,
        current_ask: liveAsk,
        seq: liveSeq,
        price_updated_at: now,
      };

      shouldSeedSessionHistory = true;
      sessionSeedBid = liveBid;
      sessionSeedAsk = liveAsk;

      await auth.supabaseAdmin.from('demo_fx_ticks').delete().eq('session_id', session_id);
      await auth.supabaseAdmin.from('demo_fx_candles').delete().eq('session_id', session_id);
      break;
    }

    case 'pause': {
      if (session.status !== 'running') {
        return NextResponse.json({ error: 'Not running' }, { status: 400 });
      }

      const elapsed = computeSessionElapsed(session);
      updates = {
        status: 'paused',
        paused_at: now,
        elapsed_ms: elapsed,
      };
      break;
    }

    case 'resume': {
      if (session.status !== 'paused') {
        return NextResponse.json({ error: 'Not paused' }, { status: 400 });
      }

      updates = {
        status: 'running',
        started_at: now,
        paused_at: null,
      };

      pairUpdates = {
        mode: 'session',
        active_session_id: session_id,
      };
      break;
    }

    case 'stop': {
      if (!['running', 'paused', 'pending'].includes(session.status)) {
        return NextResponse.json({ error: 'Nothing to stop' }, { status: 400 });
      }

      const elapsed =
        session.status === 'running'
          ? computeSessionElapsed(session)
          : Number(session.elapsed_ms || 0);

      updates = {
        status: 'stopped',
        completed_at: now,
        paused_at: null,
        elapsed_ms: elapsed,
      };

      // CRITICAL: Set to 'autopilot' so cron seamlessly resumes from current price
      pairUpdates = {
        mode: 'autopilot',
        active_session_id: null,
      };

      clearPlannerCache(session_id, session.pair_id);
      break;
    }

    default:
      return NextResponse.json(
        { error: 'Invalid action. Use: start/pause/resume/stop' },
        { status: 400 }
      );
  }

  const { data: updated, error: updateError } = await auth.supabaseAdmin
    .from('demo_fx_sessions')
    .update(updates)
    .eq('id', session_id)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  if (Object.keys(pairUpdates).length > 0) {
    const q = auth.supabaseAdmin
      .from('demo_fx_pairs')
      .update(pairUpdates)
      .eq('id', session.pair_id);

    if (action === 'stop') {
      q.eq('active_session_id', session_id);
    }

    const { error: pairUpdateError } = await q;

    if (pairUpdateError) {
      return NextResponse.json({ error: pairUpdateError.message }, { status: 400 });
    }
  }

  if (shouldSeedSessionHistory) {
    try {
      const { seedHistoricalCandles } = await import('@/lib/demo-fx/reprice-helpers');
      await seedHistoricalCandles(
        auth.supabaseAdmin,
        session.pair_id,
        session_id,
        sessionSeedBid,
        sessionSeedAsk
      );
    } catch {}
  }

  return NextResponse.json({ session: updated, action });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const { data: existingSession } = await auth.supabaseAdmin
    .from('demo_fx_sessions')
    .select('id, pair_id')
    .eq('id', id)
    .maybeSingle();

  await auth.supabaseAdmin.from('demo_fx_ticks').delete().eq('session_id', id);
  await auth.supabaseAdmin.from('demo_fx_candles').delete().eq('session_id', id);

  const { error: deleteSessionError } = await auth.supabaseAdmin
    .from('demo_fx_sessions')
    .delete()
    .eq('id', id);

  if (deleteSessionError) {
    return NextResponse.json({ error: deleteSessionError.message }, { status: 400 });
  }

  if (existingSession?.pair_id) {
    await auth.supabaseAdmin
      .from('demo_fx_pairs')
      .update({
        mode: 'autopilot',
        active_session_id: null,
      })
      .eq('id', existingSession.pair_id)
      .eq('active_session_id', id);
  }

  return NextResponse.json({ success: true });
}