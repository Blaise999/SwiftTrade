/**
 * Admin: set/view a user's withdrawal address.
 * GET  -> { withdrawal_address, withdrawal_network }
 * POST body: { address, network? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'service role not configured' }, { status: 503 });
  const { id } = await ctx.params;
  const { data } = await sb.from('users').select('withdrawal_address, withdrawal_network').eq('id', id).maybeSingle();
  return NextResponse.json({ ok: true, ...(data || {}) });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'service role not configured' }, { status: 503 });
  const { id } = await ctx.params;
  const { address, network } = await req.json().catch(() => ({} as any));
  const payload: Record<string, any> = { withdrawal_address: String(address || '').trim() || null };
  if (network != null) payload.withdrawal_network = String(network).trim() || null;
  const { error } = await sb.from('users').update(payload).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...payload });
}
