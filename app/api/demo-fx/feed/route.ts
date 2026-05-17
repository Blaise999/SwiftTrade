import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET(req: NextRequest) {
  const supabase = sb();
  const { searchParams } = new URL(req.url);
  const pairId = searchParams.get('pair_id');
  const tf = searchParams.get('tf') || '1m';
  const afterSeq = Number(searchParams.get('after_seq') || 0);

  if (!pairId) return NextResponse.json({ error: 'pair_id required' }, { status: 400 });

  const { data: pair, error: pErr } = await supabase.from('demo_fx_pairs')
    .select('id, symbol, name, current_bid, current_ask, seq, mode, active_session_id, pip_size, spread')
    .eq('id', pairId).maybeSingle();
  if (pErr || !pair) return NextResponse.json({ error: 'Pair not found' }, { status: 404 });

  let sessionData: any = null;
  if (pair.active_session_id) {
    const { data: sess } = await supabase.from('demo_fx_sessions')
      .select('id, status, session_type, elapsed_ms, duration_ms, started_at, lesson_title, lesson_description')
      .eq('id', pair.active_session_id).maybeSingle();
    if (sess) {
      let elapsed = Number(sess.elapsed_ms || 0);
      if (sess.status === 'running' && sess.started_at) elapsed += Date.now() - new Date(sess.started_at).getTime();
      const dur = Number(sess.duration_ms || 1);
      sessionData = { id: sess.id, status: sess.status, session_type: sess.session_type, elapsed_ms: elapsed, duration_ms: dur, progress: Math.min(1, elapsed / dur), lesson_title: sess.lesson_title, lesson_description: sess.lesson_description };
    }
  }

  const sessionId = pair.active_session_id;
  let cq = supabase.from('demo_fx_candles').select('bucket_start, open, high, low, close')
    .eq('pair_id', pairId).eq('timeframe', tf).order('bucket_start', { ascending: true }).limit(300);
  if (sessionId) cq = cq.eq('session_id', sessionId);
  else cq = cq.is('session_id', null);
  const { data: rawCandles } = await cq;
  const candles = (rawCandles || []).map((c: any) => ({
    time: Math.floor(new Date(c.bucket_start).getTime() / 1000),
    open: Number(c.open), high: Number(c.high), low: Number(c.low), close: Number(c.close),
  }));

  let tq = supabase.from('demo_fx_ticks').select('seq, mid, ts')
    .eq('pair_id', pairId).order('seq', { ascending: false }).limit(20);
  if (afterSeq > 0) tq = tq.gt('seq', afterSeq);
  const { data: rawTicks } = await tq;
  const latestTicks = (rawTicks || []).reverse().map((t: any) => ({ seq: Number(t.seq), mid: Number(t.mid), ts: new Date(t.ts).getTime() }));

  return NextResponse.json({
    pair: { id: pair.id, symbol: pair.symbol, current_bid: Number(pair.current_bid), current_ask: Number(pair.current_ask), seq: Number(pair.seq || 0), mode: pair.mode, active_session_id: pair.active_session_id, pip_size: Number(pair.pip_size) },
    session: sessionData,
    candles,
    latest_ticks: latestTicks,
  });
}
