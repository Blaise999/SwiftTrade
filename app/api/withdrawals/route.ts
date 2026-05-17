import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_WITHDRAW_ASSETS = {
  ETH: { asset: 'ETH', network: 'ERC20' },
  BTC: { asset: 'BTC', network: 'BTC' },
} as const;

type AssetKey = keyof typeof ALLOWED_WITHDRAW_ASSETS;

type UserBalanceRow = {
  id: string;
  balance: string | number | null;
  balance_available: string | number | null;
  balance_locked: string | number | null;
  balance_bonus: string | number | null;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const headerUserId = request.headers.get('x-user-id')?.trim();
  if (headerUserId) return headerUserId;

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  return null;
}

function resolveUserId(headerUserId: string | null, fallbackUserId?: unknown): string | null {
  const value = String(fallbackUserId || '').trim();
  return headerUserId || value || null;
}

function normalizeAsset(input: unknown): AssetKey | null {
  const value = String(input || '').trim().toUpperCase();
  if (value === 'ETH' || value === 'BTC') return value;
  return null;
}

function getNormalizedNetwork(assetKey: AssetKey): string {
  return ALLOWED_WITHDRAW_ASSETS[assetKey].network;
}

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);

    const headerUserId = await getUserIdFromRequest(request);
    const queryUserId = url.searchParams.get('userId');
    const userId = resolveUserId(headerUserId, queryUserId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        withdrawals: data || [],
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load withdrawals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();

    const headerUserId = await getUserIdFromRequest(request);
    const userId = resolveUserId(headerUserId, body?.userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const amount = Number(body?.amount ?? 0);
    const assetKey = normalizeAsset(body?.asset);
    const destinationAddress = String(body?.destinationAddress || '').trim();
    const destinationTag = String(body?.destinationTag || '').trim() || null;
    const note = String(body?.note || '').trim() || null;

    if (!assetKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid withdrawal asset. Only ETH and BTC are allowed.',
        },
        { status: 400 }
      );
    }

    // ←←← UPDATED: Minimum withdrawal is now $500
    if (!Number.isFinite(amount) || amount < 500) {
      return NextResponse.json(
        { success: false, error: 'Minimum withdrawal is $500' },
        { status: 400 }
      );
    }

    if (!destinationAddress) {
      return NextResponse.json(
        { success: false, error: 'Destination address is required' },
        { status: 400 }
      );
    }

    const normalizedAsset = ALLOWED_WITHDRAW_ASSETS[assetKey].asset;
    const normalizedNetwork = getNormalizedNetwork(assetKey);

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, balance, balance_available, balance_locked, balance_bonus')
      .eq('id', userId)
      .maybeSingle<UserBalanceRow>();

    if (userError) {
      return NextResponse.json(
        { success: false, error: userError.message },
        { status: 500 }
      );
    }

    if (!userRow) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const balanceAvailable = toNumber(userRow.balance_available ?? userRow.balance);
    const balanceLocked = toNumber(userRow.balance_locked);
    const withdrawableBalance = Math.max(0, balanceAvailable - balanceLocked);

    if (amount > withdrawableBalance) {
      return NextResponse.json(
        {
          success: false,
          error: 'Withdrawal amount exceeds available balance',
          availableBalance: withdrawableBalance,
        },
        { status: 400 }
      );
    }

    const insertPayload = {
      user_id: userId,
      amount,
      method: 'crypto',
      asset: normalizedAsset,
      network: normalizedNetwork,
      destination_address: destinationAddress,
      destination_tag: destinationTag,
      note,
      status: 'pending',
    };

    const { data: withdrawal, error: insertError } = await supabase
      .from('withdrawals')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    try {
      await supabase.from('admin_notifications').insert({
        type: 'withdrawal_request',
        title: 'New Withdrawal Request',
        message: `User ${userId} requested $${amount} ${normalizedAsset} on ${normalizedNetwork}`,
        data: {
          withdrawal_id: withdrawal.id,
          user_id: userId,
          amount,
          asset: normalizedAsset,
          network: normalizedNetwork,
        },
        read: false,
      });
    } catch {
      // ignore admin notification failure
    }

    // Send withdrawal confirmation email (fire-and-forget)
    try {
      const { sendWithdrawalRequestEmail } = await import('@/lib/email');
      const { data: userProfile } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .maybeSingle();
      if (userProfile?.email) {
        const userName = [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || 'Trader';
        void sendWithdrawalRequestEmail(userProfile.email, {
          name: userName,
          amount: `$${amount.toFixed(2)}`,
          currency: normalizedAsset,
          method: 'Crypto',
          destination: destinationAddress,
          requestId: withdrawal.id || '',
        });
      }
    } catch (e) {
      console.error('[Withdrawals] Email send failed:', e);
    }

    return NextResponse.json(
      {
        success: true,
        withdrawal,
        availableBalance: withdrawableBalance,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create withdrawal' },
      { status: 500 }
    );
  }
}