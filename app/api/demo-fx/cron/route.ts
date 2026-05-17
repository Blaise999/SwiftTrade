/**
 * DEMO FX AUTO-TICK CRON
 * GET /api/demo-fx/cron
 *
 * Run this every 10 seconds if you can.
 * It detaches expired admin sessions and keeps rare pairs alive in autopilot.
 *
 * Optional: Add ?key=YOUR_SECRET to protect it.
 */
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

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type PairRow = RuntimePairRow & {
  id: string;
};

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key') || req.headers.get('x-cron-key');
    if (key !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = sb();
  const results: any[] = [];

  const { data: pairs, error } = await supabase
    .from('demo_fx_pairs')
    .select('id, current_bid, current_ask, mode, active_session_id, seq, price_updated_at, pip_size, spread')
    .eq('is_active', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pairs || pairs.length === 0) {
    return NextResponse.json({ tick: true, results: [], msg: 'No active pairs' });
  }

  for (const raw of pairs as PairRow[]) {
    try {
      const resolved = await resolvePairRuntimeState(supabase, raw);
      const pair = await ensurePairAutopilotFresh(supabase, resolved);

      results.push({
        pair_id: pair.id,
        runtime_mode: getRuntimeMode(pair),
        seq: toNum(pair.seq, 0),
        bid: toNum(pair.current_bid, 0),
        ask: toNum(pair.current_ask, 0),
        updated_at: pair.price_updated_at,
      });
    } catch (e: any) {
      results.push({ pair_id: raw.id, error: e?.message || 'Tick failed' });
    }
  }

  return NextResponse.json({ tick: true, results, count: results.length });
}