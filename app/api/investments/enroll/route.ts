import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getInvestmentPlanById } from '@/lib/investments/plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

type EnrollBody = {
  userId: string;
  planId: string;
  amountUsd: number;
  profitMode: 'compound' | 'monthly_payout' | 'hybrid';
  shieldMode: 'off' | 'partial' | 'full';
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EnrollBody;

    if (!body.userId || !body.planId || !body.amountUsd || !body.profitMode || !body.shieldMode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const plan = getInvestmentPlanById(body.planId);

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    if (body.amountUsd < plan.minInvestment) {
      return NextResponse.json(
        { success: false, error: `Minimum allocation is $${plan.minInvestment}` },
        { status: 400 }
      );
    }

    if (plan.maxInvestment && body.amountUsd > plan.maxInvestment) {
      return NextResponse.json(
        { success: false, error: `Maximum allocation is $${plan.maxInvestment}` },
        { status: 400 }
      );
    }

    if (!plan.allowedProfitModes.includes(body.profitMode)) {
      return NextResponse.json(
        { success: false, error: 'Profit mode not allowed for this plan' },
        { status: 400 }
      );
    }

    if (!plan.allowedShieldModes.includes(body.shieldMode)) {
      return NextResponse.json(
        { success: false, error: 'Shield mode not allowed for this plan' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const now = new Date();
    const maturesAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const { data: account, error } = await supabase
      .from('user_investment_accounts')
      .insert({
        user_id: body.userId,
        plan_id: plan.id,
        status: 'pending_funding',
        amount_usd: body.amountUsd,
        current_value_usd: body.amountUsd,
        projected_return_pct: plan.projectedReturnPct,
        profit_mode: body.profitMode,
        shield_mode: body.shieldMode,
        duration_days: plan.durationDays,
        payout_frequency_label: plan.payoutFrequencyLabel,
        started_at: now.toISOString(),
        matures_at: maturesAt.toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const { error: ledgerError } = await supabase
      .from('investment_ledger_entries')
      .insert({
        investment_account_id: account.id,
        user_id: body.userId,
        entry_type: 'deposit',
        amount_usd: body.amountUsd,
        notes: `Initial allocation into ${plan.name}`,
        metadata: {
          planId: plan.id,
          profitMode: body.profitMode,
          shieldMode: body.shieldMode,
        },
      });

    if (ledgerError) {
      return NextResponse.json(
        { success: false, error: ledgerError.message },
        { status: 500 }
      );
    }

    // Send investment started email (fire-and-forget)
    try {
      const { sendInvestmentStartedEmail } = await import('@/lib/email');
      const { data: userProfile } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', body.userId)
        .maybeSingle();
      if (userProfile?.email) {
        const userName = [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || 'Trader';
        const projectedReturn = body.amountUsd * (1 + plan.projectedReturnPct / 100);
        const profitModeLabels: Record<string, string> = {
          compound: 'Compound (reinvest profits)',
          monthly_payout: 'Monthly Payout',
          hybrid: 'Hybrid (partial payout + compound)',
        };
        void sendInvestmentStartedEmail(userProfile.email, {
          name: userName,
          planName: plan.name,
          amountInvested: `$${body.amountUsd.toLocaleString()}`,
          returnRate: `${plan.projectedReturnPct}%`,
          duration: plan.durationLabel,
          profitMode: profitModeLabels[body.profitMode] || body.profitMode,
          startDate: now.toLocaleDateString('en-US', { dateStyle: 'medium' }),
          maturityDate: maturesAt.toLocaleDateString('en-US', { dateStyle: 'medium' }),
          projectedReturn: `$${projectedReturn.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        });
      }
    } catch (emailErr) {
      console.error('[Investment Enroll] Email send failed:', emailErr);
    }

    return NextResponse.json({
      success: true,
      account,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}