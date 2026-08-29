/**
 * FX lesson processor — call on a schedule (cron) or from the admin page.
 * For each running lesson, applies any step whose scheduled time has arrived:
 *   - moves the demo price [updates demo_fx_pairs so the FX page reflects it]
 *   - sends the step's Telegram message to the group
 * then marks the step executed. Completes the lesson when all steps are done.
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';
import { sendTelegram } from '@/lib/telegram-send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  return supabaseAdmin();
}
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export async function GET() { return run(); }
export async function POST() { return run(); }

async function run() {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });

  const { data: lessons } = await sb.from('fx_lessons').select('*').eq('status', 'running');
  const now = Date.now();
  const applied: any[] = [];

  for (const lesson of lessons || []) {
    const elapsedMs = now - new Date(lesson.started_at).getTime();

    const { data: steps } = await sb
      .from('fx_lesson_steps')
      .select('*')
      .eq('lesson_id', lesson.id)
      .order('step_order', { ascending: true });

    const all = steps || [];
    const due = all.filter(s => !s.executed && num(s.offset_seconds) * 1000 <= elapsedMs);

    // current pair price (for direction/pips steps)
    let pair: any = null;
    if (lesson.pair_id) {
      const { data } = await sb.from('demo_fx_pairs').select('*').eq('id', lesson.pair_id).maybeSingle();
      pair = data;
    }

    for (const step of due) {
      // move the price
      if (pair) {
        let bid = num(pair.current_bid);
        let ask = num(pair.current_ask);
        const pip = num(pair.pip_size) || 0.0001;
        if (step.target_bid != null && step.target_ask != null) {
          bid = num(step.target_bid);
          ask = num(step.target_ask);
        } else if (step.direction && step.pips != null) {
          const delta = num(step.pips) * pip * (String(step.direction).toLowerCase() === 'down' ? -1 : 1);
          bid = bid + delta;
          ask = ask + delta;
        }
        await sb.from('demo_fx_pairs').update({
          current_bid: bid, current_ask: ask,
          seq: num(pair.seq) + 1, price_updated_at: new Date().toISOString(),
        }).eq('id', pair.id);
        pair = { ...pair, current_bid: bid, current_ask: ask, seq: num(pair.seq) + 1 };
      }

      // send the telegram instruction
      if (step.telegram_message) {
        await sendTelegram(step.telegram_message);
      }

      await sb.from('fx_lesson_steps').update({ executed: true, executed_at: new Date().toISOString() }).eq('id', step.id);
      applied.push({ lesson: lesson.id, step: step.step_order, priced: !!pair, messaged: !!step.telegram_message });
    }

    // complete the lesson when every step has run
    if (all.length > 0 && all.every(s => s.executed || due.find(d => d.id === s.id))) {
      const remaining = all.filter(s => !s.executed && !due.find(d => d.id === s.id));
      if (remaining.length === 0) {
        await sb.from('fx_lessons').update({ status: 'completed' }).eq('id', lesson.id);
      }
    }
  }

  return NextResponse.json({ ok: true, applied, count: applied.length });
}
