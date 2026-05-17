/**
 * ADMIN USERS API
 *
 * GET  /api/admin/users — list all users with balances, roles, tiers, etc.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    // Try full query first (includes columns from migration)
    let users: any[] | null = null;
    let queryError: any = null;

    const { data, error } = await auth.supabaseAdmin
      .from('users')
      .select(
        `id, email, first_name, last_name,
         balance_available, balance_bonus, balance_locked,
         total_deposited, total_withdrawn, total_profit_loss,
         role, is_active, is_verified,
         kyc_status, kyc_level,
         tier_level, tier_active, tier_code, tier_activated_at,
         deposit_address, deposit_network,
         referral_code, referral_count, referred_by,
         last_login_at, created_at, updated_at`
      )
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      // Fallback: query without deposit_address columns (migration not yet run)
      const fallback = await auth.supabaseAdmin
        .from('users')
        .select(
          `id, email, first_name, last_name,
           balance_available, balance_bonus, balance_locked,
           total_deposited, total_withdrawn, total_profit_loss,
           role, is_active, is_verified,
           kyc_status, kyc_level,
           tier_level, tier_active, tier_code, tier_activated_at,
           referral_code, referral_count, referred_by,
           last_login_at, created_at, updated_at`
        )
        .order('created_at', { ascending: false })
        .limit(500);

      if (fallback.error) throw fallback.error;
      users = fallback.data;
    } else {
      users = data;
    }

    // Map to the shape the frontend expects
    const mapped = (users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,

      balance_available: Number(u.balance_available ?? 0),
      balance_bonus: Number(u.balance_bonus ?? 0),

      total_deposited: Number(u.total_deposited ?? 0),
      total_withdrawn: Number(u.total_withdrawn ?? 0),

      role: u.role || 'user',
      tier: u.tier_code || 'basic',
      tier_level: u.tier_level ?? 0,
      tier_active: u.tier_active ?? false,
      tier_code: u.tier_code || 'basic',

      is_active: u.is_active !== false,
      kyc_status: u.kyc_status || 'none',

      deposit_address: u.deposit_address || null,
      deposit_network: u.deposit_network || null,

      created_at: u.created_at,
      last_login_at: u.last_login_at || null,
    }));

    return NextResponse.json({ users: mapped });
  } catch (e: any) {
    console.error('[AdminUsers] loadUsers error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to load users' }, { status: 500 });
  }
}
