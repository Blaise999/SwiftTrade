/**
 * ADMIN USER WALLETS API
 *
 * GET  /api/admin/users/[id]/wallets — get user's wallet info
 * POST /api/admin/users/[id]/wallets — update tier_purchase_wallet and/or deposit_address
 *
 * body: {
 *   deposit_address?: string,
 *   deposit_network?: string,
 *   tier_purchase_wallet?: string,
 *   tier_purchase_network?: string,
 *   note?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: userId } = await ctx.params;
  if (!userId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

  const { data: user, error } = await auth.supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, deposit_address, deposit_network, tier_purchase_wallet, tier_purchase_network, tier_level, tier_code, tier_active')
    .eq('id', userId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ success: true, user });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: userId } = await ctx.params;
  if (!userId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const note = String(body?.note || '').trim();
  const updatePayload: Record<string, any> = {};
  const auditMeta: Record<string, any> = { note };

  // Handle deposit_address update
  if (body.deposit_address !== undefined) {
    const addr = String(body.deposit_address).trim();
    if (addr && (addr.length < 10 || addr.length > 256)) {
      return NextResponse.json({ error: 'Invalid deposit wallet address length' }, { status: 400 });
    }
    updatePayload.deposit_address = addr || null;
    if (body.deposit_network) {
      updatePayload.deposit_network = String(body.deposit_network).trim();
    }
    auditMeta.deposit_address = addr;
  }

  // Handle tier_purchase_wallet update
  if (body.tier_purchase_wallet !== undefined) {
    const addr = String(body.tier_purchase_wallet).trim();
    if (addr && (addr.length < 10 || addr.length > 256)) {
      return NextResponse.json({ error: 'Invalid tier purchase wallet address length' }, { status: 400 });
    }
    updatePayload.tier_purchase_wallet = addr || null;
    if (body.tier_purchase_network) {
      updatePayload.tier_purchase_network = String(body.tier_purchase_network).trim();
    }
    auditMeta.tier_purchase_wallet = addr;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'No wallet fields to update' }, { status: 400 });
  }

  // Fetch current user data for audit trail
  const { data: currentUser, error: fetchErr } = await auth.supabaseAdmin
    .from('users')
    .select('id, email, deposit_address, deposit_network, tier_purchase_wallet, tier_purchase_network')
    .eq('id', userId)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });
  if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  auditMeta.previous = {
    deposit_address: currentUser.deposit_address,
    deposit_network: currentUser.deposit_network,
    tier_purchase_wallet: currentUser.tier_purchase_wallet,
    tier_purchase_network: currentUser.tier_purchase_network,
  };

  // Update user
  const { data: updated, error: upErr } = await auth.supabaseAdmin
    .from('users')
    .update(updatePayload)
    .eq('id', userId)
    .select('*')
    .maybeSingle();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  // Audit log (non-blocking)
  void Promise.resolve(
    auth.supabaseAdmin.from('admin_audit_log').insert({
      admin_id: auth.adminId,
      target_user_id: userId,
      action: 'wallet_update',
      meta: auditMeta,
      created_at: new Date().toISOString(),
    })
  ).catch(() => {});

  return NextResponse.json({
    success: true,
    user: updated,
    updates: updatePayload,
  });
}
