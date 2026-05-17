/**
 * ADMIN PLATFORM WALLETS API
 * Manage the platform's receiving wallet addresses per crypto currency.
 * These are the addresses shown to users when making tier purchases or deposits.
 *
 * GET    — list all platform wallets
 * POST   — create or update a platform wallet
 * DELETE — remove a platform wallet
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── GET: LIST ALL PLATFORM WALLETS ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const walletType = searchParams.get('type'); // 'tier_checkout' | 'deposit' | null (all)

    let query = auth.supabaseAdmin
      .from('platform_wallets')
      .select('*')
      .order('currency', { ascending: true });

    if (walletType) {
      query = query.eq('wallet_type', walletType);
    }

    const { data: wallets, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ wallets: wallets || [] });
  } catch (e: any) {
    console.error('[PlatformWallets] list error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to list wallets' }, { status: 500 });
  }
}

// ─── POST: UPSERT A PLATFORM WALLET ────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    let body: any = {};
    try { body = await req.json(); } catch {}

    const {
      id, // optional — if provided, update existing
      currency,
      network,
      address,
      label,
      wallet_type, // 'tier_checkout' | 'deposit'
      is_active,
      min_amount,
      confirmations,
    } = body;

    if (!currency) return NextResponse.json({ error: 'Missing currency' }, { status: 400 });
    if (!network) return NextResponse.json({ error: 'Missing network' }, { status: 400 });
    if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    if (!wallet_type || !['tier_checkout', 'deposit'].includes(wallet_type)) {
      return NextResponse.json({ error: 'wallet_type must be tier_checkout or deposit' }, { status: 400 });
    }

    const trimmedAddr = String(address).trim();
    if (trimmedAddr.length < 10 || trimmedAddr.length > 256) {
      return NextResponse.json({ error: 'Invalid wallet address length' }, { status: 400 });
    }

    const currencyKey = String(currency).toUpperCase().trim();
    const networkKey = String(network).toUpperCase().trim();
    const safeLabel = label ? String(label).trim() : null;

    if (id) {
      // Update existing
      const updatePayload: Record<string, any> = {
        currency: currencyKey,
        network: networkKey,
        address: trimmedAddr,
        label: safeLabel,
        wallet_type,
        updated_at: new Date().toISOString(),
      };

      if (is_active !== undefined) updatePayload.is_active = is_active;
      if (min_amount !== undefined) updatePayload.min_amount = Number(min_amount) || 0;
      if (confirmations !== undefined) updatePayload.confirmations = Number(confirmations) || 1;

      const { data: wallet, error } = await auth.supabaseAdmin
        .from('platform_wallets')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      // Audit
      try {
        await auth.supabaseAdmin.from('admin_audit_log').insert({
          admin_id: auth.adminId,
          action: 'platform_wallet_update',
          meta: { wallet_id: id, currency: currencyKey, network: networkKey, wallet_type },
          created_at: new Date().toISOString(),
        });
      } catch {}

      return NextResponse.json({ wallet });
    } else {
      // Check for existing with same currency/network/type
      const { data: existing } = await auth.supabaseAdmin
        .from('platform_wallets')
        .select('id')
        .eq('currency', currencyKey)
        .eq('network', networkKey)
        .eq('wallet_type', wallet_type)
        .maybeSingle();

      if (existing) {
        // Upsert
        const { data: wallet, error } = await auth.supabaseAdmin
          .from('platform_wallets')
          .update({
            address: trimmedAddr,
            label: safeLabel,
            is_active: is_active !== false,
            min_amount: Number(min_amount) || 0,
            confirmations: Number(confirmations) || 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ wallet });
      }

      // Insert new
      const { data: wallet, error } = await auth.supabaseAdmin
        .from('platform_wallets')
        .insert({
          currency: currencyKey,
          network: networkKey,
          address: trimmedAddr,
          label: safeLabel,
          wallet_type,
          is_active: is_active !== false,
          min_amount: Number(min_amount) || 0,
          confirmations: Number(confirmations) || 1,
        })
        .select('*')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      // Audit
      try {
        await auth.supabaseAdmin.from('admin_audit_log').insert({
          admin_id: auth.adminId,
          action: 'platform_wallet_create',
          meta: { wallet_id: wallet.id, currency: currencyKey, network: networkKey, wallet_type },
          created_at: new Date().toISOString(),
        });
      } catch {}

      return NextResponse.json({ wallet }, { status: 201 });
    }
  } catch (e: any) {
    console.error('[PlatformWallets] upsert error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to save wallet' }, { status: 500 });
  }
}

// ─── DELETE: REMOVE A PLATFORM WALLET ───────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const walletId = searchParams.get('id');

    if (!walletId) {
      return NextResponse.json({ error: 'Missing wallet id' }, { status: 400 });
    }

    const { data: existing } = await auth.supabaseAdmin
      .from('platform_wallets')
      .select('id, currency, network, wallet_type')
      .eq('id', walletId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const { error } = await auth.supabaseAdmin
      .from('platform_wallets')
      .delete()
      .eq('id', walletId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Audit
    try {
      await auth.supabaseAdmin.from('admin_audit_log').insert({
        admin_id: auth.adminId,
        action: 'platform_wallet_delete',
        meta: { wallet_id: walletId, currency: existing.currency, network: existing.network, wallet_type: existing.wallet_type },
        created_at: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[PlatformWallets] delete error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to delete wallet' }, { status: 500 });
  }
}
