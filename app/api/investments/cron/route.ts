/**
 * INVESTMENT PROFIT ACCRUAL CRON
 * GET /api/investments/cron?key=CRON_SECRET
 *
 * Run this DAILY via Vercel Cron or external scheduler.
 * It checks all active investment accounts and:
 *   1. Calculates DAILY profit based on the plan's projectedReturnPct / durationDays
 *   2. Credits the profit to current_value_usd (compound) or user balance (payout)
 *   3. Logs a ledger entry for each daily accrual
 *   4. Sends monthly summary emails on 30-day boundaries
 *   5. Marks matured investments as 'matured' and returns capital
 *
 * Accrual logic: profit is credited ONCE PER DAY based on elapsed calendar days.
 * The cron checks daily so it catches the right day reliably.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  // Auth check
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const key = new URL(req.url).searchParams.get('key') || req.headers.get('x-cron-key');
    if (key !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabase();
  const now = new Date();
  const nowIso = now.toISOString();
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD for dedup
  const results: any[] = [];

  try {
    // Fetch all active/funded investment accounts
    const { data: accounts, error: fetchErr } = await supabase
      .from('user_investment_accounts')
      .select('*')
      .in('status', ['active', 'pending_funding']);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ tick: true, message: 'No active investments', results: [] });
    }

    for (const account of accounts) {
      try {
        // Auto-activate pending_funding accounts (admin may have funded them)
        if (account.status === 'pending_funding') {
          await supabase
            .from('user_investment_accounts')
            .update({ status: 'active' })
            .eq('id', account.id);
          account.status = 'active';
        }

        const startedAt = new Date(account.started_at);
        const maturesAt = new Date(account.matures_at);
        const amountUsd = Number(account.amount_usd || 0);
        const currentValue = Number(account.current_value_usd || amountUsd);
        const returnPct = Number(account.projected_return_pct || 0);
        const durationDays = Number(account.duration_days || 30);
        const profitMode = account.profit_mode || 'compound';

        // Check if investment has matured
        if (now >= maturesAt) {
          // Return full value to user balance
          const { data: user } = await supabase
            .from('users')
            .select('balance_available')
            .eq('id', account.user_id)
            .maybeSingle();

          if (user) {
            const userBalance = Number(user.balance_available || 0);
            await supabase
              .from('users')
              .update({ balance_available: userBalance + currentValue })
              .eq('id', account.user_id);
          }

          await supabase
            .from('user_investment_accounts')
            .update({
              status: 'matured',
              completed_at: nowIso,
            })
            .eq('id', account.id);

          // Log ledger entry
          await supabase.from('investment_ledger_entries').insert({
            investment_account_id: account.id,
            user_id: account.user_id,
            entry_type: 'maturity_payout',
            amount_usd: currentValue,
            notes: `Investment matured. $${currentValue.toFixed(2)} returned to balance.`,
          });

          results.push({
            account_id: account.id,
            event: 'matured',
            returned: currentValue,
          });
          continue;
        }

        // Calculate days elapsed since start
        const msElapsed = now.getTime() - startedAt.getTime();
        const daysElapsed = Math.floor(msElapsed / (24 * 60 * 60 * 1000));

        if (daysElapsed < 1) {
          results.push({ account_id: account.id, event: 'skipped', reason: 'less_than_1_day' });
          continue;
        }

        // Count how many daily accruals have already been done
        const { data: existingAccruals } = await supabase
          .from('investment_ledger_entries')
          .select('id, created_at')
          .eq('investment_account_id', account.id)
          .eq('entry_type', 'profit_accrual');

        const accrualsDone = existingAccruals?.length || 0;

        // Check if already accrued today (dedup)
        const alreadyAccruedToday = (existingAccruals || []).some((a: any) =>
          a.created_at?.startsWith(todayStr)
        );

        if (alreadyAccruedToday) {
          results.push({ account_id: account.id, event: 'skipped', reason: 'already_accrued_today' });
          continue;
        }

        // If we haven't accrued for today and haven't exceeded the plan duration
        if (daysElapsed > accrualsDone && accrualsDone < durationDays) {
          // Daily rate = total return pct / duration in days
          const dailyRate = returnPct / durationDays;
          // Profit for today based on current value (compound) or original (simple)
          const baseForCalc = profitMode === 'compound' ? currentValue : amountUsd;
          const dailyProfit = Number((baseForCalc * dailyRate / 100).toFixed(2));

          if (dailyProfit <= 0) continue;

          let newCurrentValue = currentValue;
          const dayNumber = accrualsDone + 1;

          if (profitMode === 'compound' || profitMode === 'hybrid') {
            // Add profit to investment value
            newCurrentValue = Number((currentValue + dailyProfit).toFixed(2));

            await supabase
              .from('user_investment_accounts')
              .update({
                current_value_usd: newCurrentValue,
                last_accrual_at: nowIso,
              })
              .eq('id', account.id);
          }

          if (profitMode === 'monthly_payout' || profitMode === 'hybrid') {
            // Credit profit directly to user balance
            const payoutAmount = profitMode === 'hybrid'
              ? Number((dailyProfit * 0.5).toFixed(2))  // 50% paid out in hybrid
              : dailyProfit;

            const { data: user } = await supabase
              .from('users')
              .select('balance_available')
              .eq('id', account.user_id)
              .maybeSingle();

            if (user) {
              const userBalance = Number(user.balance_available || 0);
              await supabase
                .from('users')
                .update({ balance_available: userBalance + payoutAmount })
                .eq('id', account.user_id);
            }

            // For hybrid: only compound the other 50%
            if (profitMode === 'hybrid') {
              const compoundPortion = Number((dailyProfit * 0.5).toFixed(2));
              newCurrentValue = Number((currentValue + compoundPortion).toFixed(2));
              await supabase
                .from('user_investment_accounts')
                .update({
                  current_value_usd: newCurrentValue,
                  last_accrual_at: nowIso,
                })
                .eq('id', account.id);
            }
          }

          // Log ledger entry
          await supabase.from('investment_ledger_entries').insert({
            investment_account_id: account.id,
            user_id: account.user_id,
            entry_type: 'profit_accrual',
            amount_usd: dailyProfit,
            notes: `Day ${dayNumber} profit: +$${dailyProfit.toFixed(2)} (${dailyRate.toFixed(4)}%/day)`,
            metadata: {
              day_number: dayNumber,
              daily_rate: dailyRate,
              profit_mode: profitMode,
              base_value: baseForCalc,
              new_value: newCurrentValue,
            },
          });

          // Send monthly report email on 30-day boundaries
          const isMonthBoundary = dayNumber % 30 === 0;
          if (isMonthBoundary) {
            try {
              const { sendInvestmentMonthlyEmail } = await import('@/lib/email');
              const { data: userProfile } = await supabase
                .from('users')
                .select('email, first_name, last_name')
                .eq('id', account.user_id)
                .maybeSingle();

              if (userProfile?.email) {
                const userName = [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || 'Trader';
                const totalProfit = newCurrentValue - amountUsd;
                const totalReturnPct = amountUsd > 0 ? ((totalProfit / amountUsd) * 100).toFixed(1) : '0';
                const monthNumber = Math.floor(dayNumber / 30);
                const totalMonths = Math.max(1, Math.ceil(durationDays / 30));
                const nextCreditDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                void sendInvestmentMonthlyEmail(userProfile.email, {
                  name: userName,
                  planName: account.plan_id || 'Investment Plan',
                  originalInvestment: `$${amountUsd.toLocaleString()}`,
                  currentValue: `$${newCurrentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                  monthlyProfit: `$${totalProfit.toFixed(2)}`,
                  totalProfit: `$${totalProfit.toFixed(2)}`,
                  totalReturnPct: `${totalReturnPct}%`,
                  monthNumber,
                  totalMonths,
                  maturityDate: maturesAt.toLocaleDateString('en-US', { dateStyle: 'medium' }),
                  nextCreditDate: nextCreditDate > maturesAt
                    ? 'Maturity (final payout)'
                    : nextCreditDate.toLocaleDateString('en-US', { dateStyle: 'medium' }),
                });
              }
            } catch (emailErr) {
              console.error('[Investment Cron] Email send failed:', emailErr);
            }
          }

          results.push({
            account_id: account.id,
            event: 'daily_profit_accrual',
            day: dayNumber,
            daily_profit: dailyProfit,
            new_value: newCurrentValue,
          });
        }
      } catch (accountErr: any) {
        results.push({
          account_id: account.id,
          event: 'error',
          error: accountErr?.message || 'Processing failed',
        });
      }
    }

    return NextResponse.json({
      tick: true,
      processed: accounts.length,
      results,
      timestamp: nowIso,
    });
  } catch (err: any) {
    console.error('[Investment Cron] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
