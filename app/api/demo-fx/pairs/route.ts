/**
 * USER DEMO FX PAIRS API (v2 - session-aware)
 * GET - List active demo FX pairs with session info, candles from session engine
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const pairId = searchParams.get('pair_id');
  const withChart = searchParams.get('chart') === '1';

  let query = supabase
    .from('demo_fx_pairs')
    .select('id, symbol, name, base_currency, quote_currency, pip_size, spread, current_bid, current_ask, mode, is_active, display_order, price_updated_at, active_session_id, seq')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (pairId) query = query.eq('id', pairId);

  const { data: pairs, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Fetch active session info
  const sessionsMap: Record<string, any> = {};
  if (pairs) {
    const sessionIds = pairs.map(p => (p as any).active_session_id).filter(Boolean);
    if (sessionIds.length > 0) {
      const { data: sessions } = await supabase
        .from('demo_fx_sessions')
        .select('id, session_type, status, duration_ms, elapsed_ms, started_at, tick_seq, student_instructions, lesson_title')
        .in('id', sessionIds);
      if (sessions) sessions.forEach(s => { sessionsMap[s.id] = s; });
    }
  }

  // Chart data: use pre-built candles for session mode, legacy price_log for manual
  let chartData: Record<string, any[]> = {};
  if (withChart && pairs) {
    for (const p of pairs) {
      const sid = (p as any).active_session_id;
      if (sid) {
        const { data: candles } = await supabase
          .from('demo_fx_candles')
          .select('bucket_start, open, high, low, close')
          .eq('pair_id', p.id)
          .eq('session_id', sid)
          .eq('timeframe', '1m')
          .order('bucket_start', { ascending: true })
          .limit(300);

        if (candles && candles.length > 0) {
          chartData[p.id] = candles.map((c: any) => ({
            time: new Date(c.bucket_start).getTime(),
            mid: Number(c.close),
            bid: Number(c.close),
            ask: Number(c.close),
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
          }));
        }
      } else {
        // Manual mode: check demo_fx_candles with NULL session_id first
        const { data: manualCandles } = await supabase
          .from('demo_fx_candles')
          .select('bucket_start, open, high, low, close')
          .eq('pair_id', p.id)
          .is('session_id', null)
          .eq('timeframe', '1m')
          .order('bucket_start', { ascending: true })
          .limit(300);

        if (manualCandles && manualCandles.length > 0) {
          chartData[p.id] = manualCandles.map((c: any) => ({
            time: new Date(c.bucket_start).getTime(),
            mid: Number(c.close),
            bid: Number(c.close),
            ask: Number(c.close),
            open: Number(c.open),
            high: Number(c.high),
            low: Number(c.low),
            close: Number(c.close),
          }));
        } else {
          // Fallback: build chart from price_log
          const { data: logs } = await supabase
            .from('demo_fx_price_log')
            .select('bid, ask, logged_at')
            .eq('pair_id', p.id)
            .order('logged_at', { ascending: true })
            .limit(500);

          if (logs && logs.length > 0) {
            chartData[p.id] = logs.map((l: any) => ({
              time: new Date(l.logged_at).getTime(),
              bid: Number(l.bid),
              ask: Number(l.ask),
              mid: (Number(l.bid) + Number(l.ask)) / 2,
            }));
          }
        }
      }
    }
  }

  const enriched = (pairs || []).map(p => ({
    ...p,
    session: (p as any).active_session_id ? (sessionsMap[(p as any).active_session_id] || null) : null,
  }));

  return NextResponse.json({ pairs: enriched, chart: withChart ? chartData : undefined });
}
