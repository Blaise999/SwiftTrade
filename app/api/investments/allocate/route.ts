import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as supabaseClient } from '@/lib/supabase/client'; // your existing helper if you want

// Hardcoded daily yields (exact same as frontend)
const planDailyYields: Record<string, number> = {
  preserve: 0.167,
  grow: 0.2,
  accelerate: 0.222,
  'private-wealth': 0.194,
};

export async function POST(req: NextRequest) {
  try {
    const { userId, planId, amountUsd, profitMode, shieldMode } = await req.json();

    // Basic validation
    if (!userId || !planId || !amountUsd || amountUsd <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const dailyYield = planDailyYields[planId];
    if (!dailyYield) {
      return NextResponse.json({ success: false, error: 'Invalid plan' }, { status: 400 });
    }

    // Use service role key for admin privileges (bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get current user balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('balance_available, balance_locked')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const spendable = Number(user.balance_available || 0) - Number(user.balance_locked || 0);

    if (spendable < amountUsd) {
      return NextResponse.json({ success: false, error: 'Insufficient balance' }, { status: 400 });
    }

    // 2. Create the investment account (MMF style)
    const { error: insertError } = await supabase
      .from('user_investment_accounts')
      .insert({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        amount_usd: amountUsd,
        current_value_usd: amountUsd,           // starts at allocated amount
        daily_yield: dailyYield,                // ← this powers daily growth
        projected_return_pct: 0,                // you can update later if needed
        profit_mode: profitMode,
        shield_mode: shieldMode,
        duration_days: planId === 'preserve' ? 30 : planId === 'grow' ? 60 : planId === 'accelerate' ? 90 : 180,
        created_at: new Date().toISOString(),
        // matures_at can stay null or set far in future since it's ongoing MMF
      });

    if (insertError) throw insertError;

    // 3. Deduct from user balance
    const newBalanceAvailable = Number(user.balance_available) - amountUsd;

    const { error: updateError } = await supabase
      .from('users')
      .update({
        balance_available: newBalanceAvailable,
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Success
    return NextResponse.json({
      success: true,
      result: {
        newBalanceAvailable,
        message: `Successfully allocated $${amountUsd} to ${planId} plan`,
      },
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { success: false, error: err.message || 'Allocation failed' },
      { status: 500 }
    );
  }
}