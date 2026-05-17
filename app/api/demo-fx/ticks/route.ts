import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  ensurePairAutopilotFresh,
  getRuntimeMode,
  resolvePairRuntimeState,
  toNum,
  type RuntimePairRow,
} from '@/lib/demo-fx/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_TICK_LIMIT = Math.max(
  20,
  parseInt(process.env.DEMO_FX_TICK_PULL_LIMIT || '200', 10) || 200
);

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type PairRow = RuntimePairRow & {
  symbol: string;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const pairId = String(searchParams.get('pair_id') || '').trim();
    const sinceSeq = Math.max(
      toNum(searchParams.get('since_seq'), 0),
      toNum(searchParams.get('after_seq'), 0)
    );
    const limit = Math.min(
      Math.max(toNum(searchParams.get('limit'), DEFAULT_TICK_LIMIT), 1),
      500
    );

    if (!pairId) {
      return NextResponse.json({ error: 'pair_id required' }, { status: 400 });
    }

    const supabase = sb();

    const { data: rawPair, error: pairErr } = await supabase
      .from('demo_fx_pairs')
      .select(
        'id, symbol, current_bid, current_ask, mode, active_session_id, seq, price_updated_at, pip_size, spread'
      )
      .eq('id', pairId)
      .maybeSingle<PairRow>();

    if (pairErr || !rawPair) {
      return NextResponse.json({ error: 'Pair not found' }, { status: 404 });
    }

    const resolvedPair = await resolvePairRuntimeState(supabase, rawPair);
    const pair = await ensurePairAutopilotFresh(supabase, resolvedPair);

    let session: any = null;
    if (pair.active_session_id) {
      const { data: s } = await supabase
        .from('demo_fx_sessions')
        .select(
          'id, session_type, status, duration_ms, elapsed_ms, started_at, tick_seq, student_instructions, lesson_title, lesson_description'
        )
        .eq('id', pair.active_session_id)
        .maybeSingle();

      if (s) {
        let elapsed = toNum(s.elapsed_ms, 0);
        if (s.status === 'running' && s.started_at) {
          elapsed += Math.max(0, Date.now() - new Date(s.started_at).getTime());
        }
        const duration = Math.max(1, toNum(s.duration_ms, 1));

        session = {
          ...s,
          elapsed_ms: elapsed,
          progress: Math.min(1, elapsed / duration),
        };
      }
    }

    const { data: rawTicks, error: tickErr } = await supabase
      .from('demo_fx_ticks')
      .select('bid, ask, mid, seq, ts, session_id')
      .eq('pair_id', pairId)
      .gt('seq', sinceSeq)
      .order('seq', { ascending: true })
      .limit(limit);

    if (tickErr) {
      return NextResponse.json({ error: tickErr.message }, { status: 500 });
    }

    const ticks = (rawTicks || []).map((t: any) => ({
      seq: toNum(t.seq, 0),
      bid: toNum(t.bid, 0),
      ask: toNum(t.ask, 0),
      mid: toNum(t.mid, 0),
      ts: new Date(t.ts).getTime(),
      session_id: t.session_id ?? null,
    }));

    const currentBid = toNum(pair.current_bid, 0);
    const currentAsk = toNum(pair.current_ask, 0);
    const currentMid =
      currentBid > 0 && currentAsk > 0 ? (currentBid + currentAsk) / 2 : 0;

    return NextResponse.json(
      {
        ok: true,
        pair: {
          id: pair.id,
          symbol: pair.symbol,
          bid: currentBid,
          ask: currentAsk,
          mid: currentMid,
          mode: pair.mode,
          runtime_mode: getRuntimeMode(pair),
          session_id: pair.active_session_id,
          seq: toNum(pair.seq, 0),
          pip_size: toNum(pair.pip_size, 0),
          spread: toNum(pair.spread, 0),
          updated_at: pair.price_updated_at,
        },
        session,
        ticks,
        latest_ticks: ticks,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status: 500 }
    );
  }
}