/**
 * FX teaching lessons.
 *  POST  → create + start a lesson (pair + timed steps), optionally announce start.
 *  GET   → list lessons (newest first) with their steps.
 *
 * A step = { offset_seconds, target_bid?/target_ask? OR direction+pips, instruction, telegram_message }.
 * The /api/demo-fx/lesson-tick processor applies each step at its scheduled time.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendTelegram } from '@/lib/telegram-send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });
  const { data: lessons } = await sb.from('fx_lessons').select('*').order('created_at', { ascending: false }).limit(20);
  const ids = (lessons || []).map(l => l.id);
  const { data: steps } = ids.length
    ? await sb.from('fx_lesson_steps').select('*').in('lesson_id', ids).order('step_order', { ascending: true })
    : { data: [] as any[] };
  const byLesson: Record<string, any[]> = {};
  for (const s of steps || []) (byLesson[s.lesson_id] ||= []).push(s);
  return NextResponse.json({ ok: true, lessons: (lessons || []).map(l => ({ ...l, steps: byLesson[l.id] || [] })) });
}

export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });

  const body = await req.json().catch(() => ({} as any));
  const { pair_id, pair_symbol, title, steps, announce } = body;
  if (!Array.isArray(steps) || steps.length === 0) {
    return NextResponse.json({ ok: false, error: 'at least one step required' }, { status: 400 });
  }

  const { data: lesson, error } = await sb
    .from('fx_lessons')
    .insert({ pair_id: pair_id || null, pair_symbol: pair_symbol || null, title: title || 'FX lesson', status: 'running', started_at: new Date().toISOString() })
    .select('*').single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const rows = steps.map((s: any, i: number) => ({
    lesson_id: lesson.id,
    step_order: i,
    offset_seconds: Math.max(0, Math.round(Number(s.offset_seconds) || 0)),
    target_bid: s.target_bid != null && s.target_bid !== '' ? Number(s.target_bid) : null,
    target_ask: s.target_ask != null && s.target_ask !== '' ? Number(s.target_ask) : null,
    direction: s.direction || null,
    pips: s.pips != null && s.pips !== '' ? Number(s.pips) : null,
    instruction: s.instruction || null,
    telegram_message: s.telegram_message || null,
    executed: false,
  }));
  const { error: sErr } = await sb.from('fx_lesson_steps').insert(rows);
  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 });

  if (announce) {
    await sendTelegram(`📚 <b>${title || 'FX lesson'}</b> starting${pair_symbol ? ` on <b>${pair_symbol}</b>` : ''}. Watch this space — instructions incoming.`);
  }

  return NextResponse.json({ ok: true, lesson_id: lesson.id });
}
