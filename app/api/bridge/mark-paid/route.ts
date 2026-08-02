/**
 * POST /api/bridge/mark-paid   (header: x-user-id)  body: { request_id }
 *
 * Lets a user say "I've paid" and move their SwiftBridge request into
 * verification WITHOUT uploading a receipt. The desk verifies manually; the
 * user can still upload proof later. Owner-scoped.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role not configured' }, { status: 503 });

  const userId = req.headers.get('x-user-id');
  const { request_id } = await req.json().catch(() => ({} as any));
  if (!userId) return NextResponse.json({ ok: false, error: 'x-user-id required' }, { status: 400 });
  if (!request_id) return NextResponse.json({ ok: false, error: 'request_id required' }, { status: 400 });

  // must belong to the user and be awaiting payment
  const { data: reqRow } = await sb
    .from('bridge_requests')
    .select('id, user_id, status')
    .eq('id', request_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (!reqRow) return NextResponse.json({ ok: false, error: 'request not found' }, { status: 404 });
  if (!['awaiting_admin', 'awaiting_payment'].includes(reqRow.status)) {
    return NextResponse.json({ ok: true, status: reqRow.status, note: 'already progressed' });
  }

  const { error } = await sb
    .from('bridge_requests')
    .update({
      status: 'awaiting_verification',
      admin_response_message: 'User marked as paid — no receipt uploaded yet.',
      updated_at: new Date().toISOString(),
    })
    .eq('id', request_id)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: 'awaiting_verification' });
}
