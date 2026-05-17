/**
 * ADMIN PER-CURRENCY DEPOSIT WALLETS API
 * GET  - List all wallets for a user
 * POST - Add or update a wallet for a specific currency/network
 * DELETE - Remove a wallet
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  const { data: wallets, error } = await auth.supabaseAdmin
    .from('user_deposit_wallets')
    .select('*')
    .eq('user_id', userId)
    .order('currency', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ wallets });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: userId } = await ctx.params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const { currency, network, address, label, wallet_type } = body;

  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  if (!currency) {
    return NextResponse.json({ error: 'Missing currency' }, { status: 400 });
  }

  if (!network) {
    return NextResponse.json({ error: 'Missing network' }, { status: 400 });
  }

  if (!address) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 });
  }

  const trimmedAddr = String(address).trim();
  if (trimmedAddr.length < 10 || trimmedAddr.length > 256) {
    return NextResponse.json(
      { error: 'Invalid wallet address length' },
      { status: 400 }
    );
  }

  const currencyKey = String(currency).toUpperCase().trim();
  const networkKey = String(network).toUpperCase().trim();
  const safeLabel = label ? String(label).trim() : null;
  const safeWalletType = ['deposit', 'tier_checkout', 'both'].includes(wallet_type) ? wallet_type : 'both';

  // Upsert: update if exists, insert if not
  const { data: existing, error: existingError } = await auth.supabaseAdmin
    .from('user_deposit_wallets')
    .select('id')
    .eq('user_id', userId)
    .eq('currency', currencyKey)
    .eq('network', networkKey)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }

  let wallet: any = null;
  let walletError: any = null;

  if (existing) {
    const result = await auth.supabaseAdmin
      .from('user_deposit_wallets')
      .update({
        address: trimmedAddr,
        label: safeLabel,
        wallet_type: safeWalletType,
        is_active: true,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    wallet = result.data;
    walletError = result.error;
  } else {
    const result = await auth.supabaseAdmin
      .from('user_deposit_wallets')
      .insert({
        user_id: userId,
        currency: currencyKey,
        network: networkKey,
        address: trimmedAddr,
        label: safeLabel,
        wallet_type: safeWalletType,
      })
      .select('*')
      .single();

    wallet = result.data;
    walletError = result.error;
  }

  if (walletError) {
    return NextResponse.json({ error: walletError.message }, { status: 400 });
  }

  // Audit
  try {
    await auth.supabaseAdmin.from('admin_audit_log').insert({
      admin_id: auth.adminId,
      target_user_id: userId,
      action: 'deposit_wallet_upsert',
      meta: {
        currency: currencyKey,
        network: networkKey,
        address: trimmedAddr,
        label: safeLabel,
        wallet_type: safeWalletType,
      },
      created_at: new Date().toISOString(),
    });
  } catch {
    // intentionally ignore audit log failures
  }

  return NextResponse.json({ wallet });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: userId } = await ctx.params;
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const walletId = searchParams.get('wallet_id');

  if (!walletId) {
    return NextResponse.json({ error: 'Missing wallet_id' }, { status: 400 });
  }

  const { data: existingWallet, error: fetchError } = await auth.supabaseAdmin
    .from('user_deposit_wallets')
    .select('id, currency, network, address')
    .eq('id', walletId)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  if (!existingWallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  const { error: deleteError } = await auth.supabaseAdmin
    .from('user_deposit_wallets')
    .delete()
    .eq('id', walletId)
    .eq('user_id', userId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  // Audit
  try {
    await auth.supabaseAdmin.from('admin_audit_log').insert({
      admin_id: auth.adminId,
      target_user_id: userId,
      action: 'deposit_wallet_delete',
      meta: {
        wallet_id: walletId,
        currency: existingWallet.currency,
        network: existingWallet.network,
        address: existingWallet.address,
      },
      created_at: new Date().toISOString(),
    });
  } catch {
    // intentionally ignore audit log failures
  }

  return NextResponse.json({ success: true });
}