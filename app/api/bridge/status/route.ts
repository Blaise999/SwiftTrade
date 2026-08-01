/**
 * GET /api/bridge/status?id=<requestId>   (header: x-user-id)
 *
 * User-facing read of a single SwiftBridge request, scoped to the owner so a
 * user can only poll their own. The client status hook calls this.
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

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'service role not configured' }, { status: 503 });

  const id = new URL(req.url).searchParams.get('id');
  const userId = req.headers.get('x-user-id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (!userId) return NextResponse.json({ error: 'x-user-id required' }, { status: 400 });

  const { data: request, error } = await sb
    .from('bridge_requests')
    .select('id, status, local_amount, local_currency, target_asset, estimated_credit_usd, credited_amount_usd, created_at')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!request) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({ ok: true, request });
}
