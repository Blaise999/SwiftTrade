/**
 * USER WALLET — connect / disconnect self-custody wallet
 *
 * POST   /api/user/wallet  { userId, wallet }   → saves wallet_address
 * DELETE /api/user/wallet  { userId }           → clears wallet_address
 *
 * Writes directly to `public.users` via service role to avoid
 * (a) the read-only profiles view and (b) RLS UPDATE restrictions.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const isAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);

export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || req.headers.get('x-user-id') || '');
    const wallet = String(body.wallet || '').trim();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ error: 'wallet must be a valid 0x address' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        wallet_address: wallet.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, wallet_address, registration_status')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data)  return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ ok: true, user: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const userId = String(body.userId || req.headers.get('x-user-id') || '');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        wallet_address: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data)  return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
