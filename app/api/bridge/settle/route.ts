/**
 * SwiftBridge — settle worker (CORRECTED columns).
 * Uses the REAL bridge_requests columns: estimated_usd / final_credit_usd /
 * completed_at, and credits via credit_user_usd. Replaces the drop-3 version,
 * which used estimated_credit_usd / credited_amount_usd (those columns don't
 * exist in your schema).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
const OPEN = ['awaiting_admin', 'awaiting_payment', 'awaiting_verification'];
const NEXT: Record<string, string> = {
  awaiting_admin: 'awaiting_payment',
  awaiting_payment: 'awaiting_verification',
  awaiting_verification: 'completed',
};

function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function cronOk(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const key = new URL(req.url).searchParams.get('key');
  const hdr = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return key === secret || hdr === secret;
}

function creditUsd(r: any): number {
  const est = Number(r.estimated_usd);
  if (Number.isFinite(est) && est > 0) return est;
  const local = Number(r.local_amount);
  const rate = Number(r.fx_rate); // 1 USD = rate local
  if (local > 0 && rate > 0) return local / rate;
  return 0;
}

async function creditUserUsd(sb: SupabaseClient, userId: string, amount: number) {
  const { error } = await sb.rpc('credit_user_usd', { p_user: userId, p_amount: amount });
  if (error) {
    const { data } = await sb.from('users').select('balance_available').eq('id', userId).maybeSingle();
    const cur = Number(data?.balance_available) || 0;
    await sb.from('users').update({ balance_available: cur + amount, updated_at: new Date().toISOString() }).eq('id', userId);
  }
}

async function complete(sb: SupabaseClient, r: any) {
  const credit = creditUsd(r);
  await sb
    .from('bridge_requests')
    .update({ status: 'completed', final_credit_usd: credit, completed_at: new Date().toISOString() })
    .eq('id', r.id)
    .neq('status', 'completed');
  if (credit > 0) await creditUserUsd(sb, r.user_id, credit);
  return credit;
}

export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });

  const body = await req.json().catch(() => ({} as any));
  const requestId = body?.request_id ? String(body.request_id) : null;

  if (requestId) {
    if (!cronOk(req) && !DEMO_MODE) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 403 });
    const { data: r } = await sb.from('bridge_requests').select('*').eq('id', requestId).maybeSingle();
    if (!r) return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
    if (r.status === 'completed' || r.status === 'rejected') return NextResponse.json({ ok: true, already: r.status });
    const credited = await complete(sb, r);
    return NextResponse.json({ ok: true, settled: requestId, credited });
  }
  return tick(sb, req);
}

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });
  return tick(sb, req);
}

async function tick(sb: SupabaseClient, req: NextRequest) {
  if (!cronOk(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 403 });
  if (!DEMO_MODE) return NextResponse.json({ ok: true, skipped: 'demo auto-advance disabled' });

  const { data: open } = await sb.from('bridge_requests').select('*').in('status', OPEN).limit(50);
  const results = [];
  for (const r of open || []) {
    const to = NEXT[r.status] || 'completed';
    if (to === 'completed') {
      const credited = await complete(sb, r);
      results.push({ id: r.id, to, credited });
    } else {
      await sb.from('bridge_requests').update({ status: to }).eq('id', r.id).eq('status', r.status);
      results.push({ id: r.id, to, credited: 0 });
    }
  }
  return NextResponse.json({ ok: true, advanced: results.length, results });
}
