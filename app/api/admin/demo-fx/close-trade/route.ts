import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { calculateFinalPnL } from '@/lib/demo-fx/pnl';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const { trade_id } = body;
  if (!trade_id) return NextResponse.json({ error: 'Missing trade_id' }, { status: 400 });

  const { data: trade } = await auth.supabaseAdmin
    .from('demo_fx_trades').select('*').eq('id', trade_id).eq('status', 'open').maybeSingle();
  if (!trade) return NextResponse.json({ error: 'Trade not found or already closed' }, { status: 404 });

  const { data: pair } = await auth.supabaseAdmin
    .from('demo_fx_pairs').select('current_bid, current_ask').eq('id', trade.pair_id).maybeSingle();
  if (!pair) return NextResponse.json({ error: 'Pair not found' }, { status: 404 });

  const exitPrice = Number(trade.direction) === 1 ? Number(pair.current_bid) : Number(pair.current_ask);
  const finalPnl = calculateFinalPnL(trade.direction, Number(trade.investment), Number(trade.multiplier), Number(trade.entry_price), exitPrice);
  const now = new Date().toISOString();

  await auth.supabaseAdmin.from('demo_fx_trades').update({
    status: 'closed', close_reason: 'admin', exit_price: exitPrice,
    final_pnl: finalPnl, current_price: exitPrice, floating_pnl: finalPnl, closed_at: now,
  }).eq('id', trade_id);

  const returnAmount = Math.max(0, Number(trade.investment) + finalPnl);
  if (returnAmount > 0) {
    const { data: user } = await auth.supabaseAdmin.from('users').select('balance_available').eq('id', trade.user_id).maybeSingle();
    await auth.supabaseAdmin.from('users').update({ balance_available: Number(user?.balance_available || 0) + returnAmount }).eq('id', trade.user_id);
  }

  return NextResponse.json({ ok: true, final_pnl: finalPnl, return_amount: returnAmount });
}
