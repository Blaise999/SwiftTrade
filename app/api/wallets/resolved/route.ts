import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  WALLET_CATALOG,
  type WalletCatalogSlot,
  type WalletPurpose,
  type WalletType,
  type ResolvedWallet,
  normalizeKeyPart,
  walletKey,
} from '@/lib/wallet-catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type PlatformWalletRow = {
  id: string;
  currency: string;
  network: string;
  address: string;
  label: string | null;
  wallet_type: WalletType;
  is_active: boolean;
  min_amount: number | null;
  confirmations: number | null;
};

type UserWalletRow = {
  id: string;
  user_id: string;
  currency: string;
  network: string;
  address: string;
  label: string | null;
  wallet_type: WalletType;
  is_active: boolean;
};

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (i: any, x: any) => fetch(i, { ...(x || {}), cache: 'no-store' }) },
    }
  );
}

function isWalletPurpose(value: string | null): value is WalletPurpose {
  return value === 'deposit' || value === 'tier_checkout';
}

function rowMatchesSlot(
  row: { currency?: string | null; network?: string | null },
  slot: WalletCatalogSlot
) {
  return walletKey(row.currency, row.network) === walletKey(slot.symbol, slot.network);
}

function pickBestRow<T extends { currency?: string | null; network?: string | null; wallet_type?: string | null; is_active?: boolean | null }>(
  rows: T[],
  slot: WalletCatalogSlot,
  purpose: WalletPurpose
): T | null {
  const candidates = rows.filter((row: T) => {
    if (row.is_active === false) return false;
    if (!rowMatchesSlot(row, slot)) return false;

    const type = normalizeKeyPart(row.wallet_type);
    return type === normalizeKeyPart(purpose) || type === 'BOTH';
  });

  const exact = candidates.find(
    (row: T) => normalizeKeyPart(row.wallet_type) === normalizeKeyPart(purpose)
  );

  if (exact) return exact;

  const both = candidates.find((row: T) => normalizeKeyPart(row.wallet_type) === 'BOTH');
  return both ?? null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const purposeParam = searchParams.get('purpose');
  const userId = searchParams.get('userId');

  if (!isWalletPurpose(purposeParam)) {
    return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 });
  }

  const purpose: WalletPurpose = purposeParam;
  const supabase = sb();

  let globalRows: PlatformWalletRow[] = [];
  let userRows: UserWalletRow[] = [];

  const globalQuery = await supabase
    .from('platform_wallets')
    .select(
      'id, currency, network, address, label, wallet_type, is_active, min_amount, confirmations'
    )
    .in('wallet_type', [purpose, 'both'])
    .eq('is_active', true);

  if (!globalQuery.error) {
    globalRows = (globalQuery.data || []) as PlatformWalletRow[];
  }

  if (userId) {
    const userQuery = await supabase
      .from('user_deposit_wallets')
      .select('id, user_id, currency, network, address, label, wallet_type, is_active')
      .eq('user_id', userId)
      .in('wallet_type', [purpose, 'both'])
      .eq('is_active', true);

    if (!userQuery.error) {
      userRows = (userQuery.data || []) as UserWalletRow[];
    }
  }

  const resolved: ResolvedWallet[] = WALLET_CATALOG.map(
    (slot: WalletCatalogSlot): ResolvedWallet => {
      const userRow = pickBestRow<UserWalletRow>(userRows, slot, purpose);
      const globalRow = pickBestRow<PlatformWalletRow>(globalRows, slot, purpose);

      return {
        id: `${purpose}-${slot.symbol}-${slot.network}`,
        symbol: slot.symbol,
        network: slot.network,
        name: slot.name,
        icon: slot.icon,
        address: userRow?.address || globalRow?.address || slot.defaultAddress,
        enabled: true,
        label: userRow?.label || globalRow?.label || slot.name,
        walletType: purpose,
        source: userRow ? 'user' : globalRow ? 'global' : 'default',
        minAmount: Number(globalRow?.min_amount ?? 0),
        confirmations: Number(globalRow?.confirmations ?? 0),
      };
    }
  );

  return NextResponse.json({ wallets: resolved });
}