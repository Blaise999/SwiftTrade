/**
 * ADMIN REFERRALS API
 *
 * GET /api/admin/referrals — list all referral data with referrer + referred user info
 *   ?search=   — filter by email/name
 *   ?status=   — 'all' | 'rewarded' | 'pending'
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') || 'all';
  const search = (searchParams.get('search') || '').trim().toLowerCase();

  try {
    // 1. Load all referrals with joined user data
    let query = auth.supabaseAdmin
      .from('referrals')
      .select(`
        id,
        referrer_id,
        referred_user_id,
        reward_paid,
        reward_amount,
        reward_trigger,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (status === 'rewarded') {
      query = query.eq('reward_paid', true);
    } else if (status === 'pending') {
      query = query.eq('reward_paid', false);
    }

    const { data: referrals, error: refError } = await query;

    if (refError) {
      return NextResponse.json({ success: false, error: refError.message }, { status: 500 });
    }

    if (!referrals || referrals.length === 0) {
      return NextResponse.json({ success: true, referrals: [], stats: { total: 0, rewarded: 0, pending: 0, totalRewards: 0 } });
    }

    // 2. Collect all unique user IDs (referrers + referred)
    const allUserIds = new Set<string>();
    for (const r of referrals) {
      if (r.referrer_id) allUserIds.add(r.referrer_id);
      if (r.referred_user_id) allUserIds.add(r.referred_user_id);
    }

    // 3. Batch-load user details
    const { data: usersData, error: usersError } = await auth.supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, tier_level, tier_code, tier_active, referral_code, created_at, balance_available')
      .in('id', Array.from(allUserIds));

    if (usersError) {
      return NextResponse.json({ success: false, error: usersError.message }, { status: 500 });
    }

    const usersMap = new Map<string, any>();
    for (const u of (usersData || [])) {
      usersMap.set(u.id, u);
    }

    // 4. Enrich referrals with user data
    let enriched = referrals.map((r: any) => ({
      ...r,
      referrer: usersMap.get(r.referrer_id) || null,
      referred: usersMap.get(r.referred_user_id) || null,
    }));

    // 5. Apply search filter on enriched data
    if (search) {
      enriched = enriched.filter((r: any) => {
        const referrerEmail = (r.referrer?.email || '').toLowerCase();
        const referrerName = `${r.referrer?.first_name || ''} ${r.referrer?.last_name || ''}`.toLowerCase();
        const referredEmail = (r.referred?.email || '').toLowerCase();
        const referredName = `${r.referred?.first_name || ''} ${r.referred?.last_name || ''}`.toLowerCase();
        const referralCode = (r.referrer?.referral_code || '').toLowerCase();

        return (
          referrerEmail.includes(search) ||
          referrerName.includes(search) ||
          referredEmail.includes(search) ||
          referredName.includes(search) ||
          referralCode.includes(search)
        );
      });
    }

    // 6. Load referral codes table for code listing
    const { data: codes } = await auth.supabaseAdmin
      .from('referral_codes')
      .select('user_id, code')
      .order('created_at', { ascending: false });

    const codesMap = new Map<string, string>();
    for (const c of (codes || [])) {
      codesMap.set(c.user_id, c.code);
    }

    // 7. Build referrer summary (grouped by referrer)
    const referrerSummary = new Map<string, { referrer: any; totalReferred: number; totalRewards: number; referralCode: string }>();

    for (const r of enriched) {
      const rid = r.referrer_id;
      if (!referrerSummary.has(rid)) {
        const code = codesMap.get(rid) || r.referrer?.referral_code || '—';
        referrerSummary.set(rid, {
          referrer: r.referrer,
          totalReferred: 0,
          totalRewards: 0,
          referralCode: code,
        });
      }
      const entry = referrerSummary.get(rid)!;
      entry.totalReferred += 1;
      entry.totalRewards += Number(r.reward_amount || 0);
    }

    // 8. Stats
    const stats = {
      total: enriched.length,
      rewarded: enriched.filter((r: any) => r.reward_paid).length,
      pending: enriched.filter((r: any) => !r.reward_paid).length,
      totalRewards: enriched.reduce((sum: number, r: any) => sum + Number(r.reward_amount || 0), 0),
      uniqueReferrers: referrerSummary.size,
    };

    return NextResponse.json({
      success: true,
      referrals: enriched,
      referrerSummary: Array.from(referrerSummary.values()),
      stats,
    });
  } catch (err: any) {
    console.error('[Admin Referrals] Error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Internal error' }, { status: 500 });
  }
}
