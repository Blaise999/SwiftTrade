'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Shield,
  Clock,
  Percent,
  ArrowRight,
  Calculator,
  AlertCircle,
  CheckCircle,
  Wallet,
  PiggyBank,
  Building2,
  Zap,
  Loader2,
  Lock,
  BarChart3,
  Plus,
  ArrowDownCircle,
} from 'lucide-react';
import { useStore } from '@/lib/supabase/store-supabase';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import KYCGate from '@/components/KYCGate';

type PlanId = 'preserve' | 'grow' | 'accelerate' | 'private-wealth';
type ProfitMode = 'compound' | 'monthly_payout' | 'hybrid';
type ShieldMode = 'off' | 'partial' | 'full';

type InvestmentPlan = {
  id: PlanId;
  name: string;
  description: string;
  minInvestment: number;
  maxInvestment: number | null;
  roi: number;
  dailyYield: number;
  duration: number;
  durationLabel: string;
  payoutFrequency: string;
  riskLabel: string;
  features: string[];
  icon: any;
  color: string;
  borderColor: string;
  popular: boolean;
  allowedProfitModes: ProfitMode[];
  allowedShieldModes: ShieldMode[];
};

const investmentPlans: InvestmentPlan[] = [
  {
    id: 'preserve',
    name: 'Preserve Plan',
    description: 'Protection-first strategy built for smoother performance and lower volatility.',
    minInvestment: 1000,
    maxInvestment: 4999,
    roi: 5,
    dailyYield: 0.167,
    duration: 30,
    durationLabel: '30 Days',
    payoutFrequency: 'Daily price increment',
    riskLabel: 'Low Risk',
    features: [
      'Capital preservation focused',
      'Shield protection available',
      'Lower-volatility portfolio mix',
      'Flexible or fixed duration',
    ],
    icon: PiggyBank,
    color: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-500/20',
    popular: false,
    allowedProfitModes: ['compound', 'monthly_payout'],
    allowedShieldModes: ['partial', 'full'],
  },
  {
    id: 'grow',
    name: 'Grow Plan',
    description: 'Balanced multi-asset strategy for users seeking steady growth with controlled risk.',
    minInvestment: 5000,
    maxInvestment: 9999,
    roi: 12,
    dailyYield: 0.2,
    duration: 60,
    durationLabel: '60 Days',
    payoutFrequency: 'Daily price increment',
    riskLabel: 'Balanced',
    features: [
      'Balanced stocks, FX, and crypto mix',
      'Partial or Full Shield support',
      'Flexible payout structure',
      'Priority support',
      'Smart allocation model',
    ],
    icon: TrendingUp,
    color: 'from-profit to-emerald-600',
    borderColor: 'border-profit/20',
    popular: true,
    allowedProfitModes: ['compound', 'monthly_payout', 'hybrid'],
    allowedShieldModes: ['off', 'partial', 'full'],
  },
  {
    id: 'accelerate',
    name: 'Accelerate Plan',
    description: 'Higher-growth strategy for users comfortable with more active market exposure.',
    minInvestment: 10000,
    maxInvestment: 24999,
    roi: 20,
    dailyYield: 0.222,
    duration: 90,
    durationLabel: '90 Days',
    payoutFrequency: 'Daily price increment',
    riskLabel: 'High Growth',
    features: [
      'Growth-focused allocation',
      'Advanced Shield controls',
      'Crypto and FX weighted strategy',
      'Compounding option available',
      'Dedicated account support',
      'Enhanced portfolio tracking',
    ],
    icon: Zap,
    color: 'from-gold to-yellow-600',
    borderColor: 'border-gold/30',
    popular: false,
    allowedProfitModes: ['compound', 'monthly_payout', 'hybrid'],
    allowedShieldModes: ['off', 'partial', 'full'],
  },
  {
    id: 'private-wealth',
    name: 'Private Wealth',
    description: 'Premium plan for larger balances, tailored allocation, and deeper portfolio control.',
    minInvestment: 25000,
    maxInvestment: null,
    roi: 35,
    dailyYield: 0.194,
    duration: 180,
    durationLabel: '180 Days',
    payoutFrequency: 'Daily price increment',
    riskLabel: 'Custom',
    features: [
      'Custom portfolio configuration',
      'Priority processing and support',
      'Flexible Shield logic',
      'Advanced reporting',
      'High-balance account management',
      'Private onboarding experience',
    ],
    icon: Building2,
    color: 'from-purple-500 to-pink-600',
    borderColor: 'border-purple-500/30',
    popular: false,
    allowedProfitModes: ['compound', 'monthly_payout', 'hybrid'],
    allowedShieldModes: ['off', 'partial', 'full'],
  },
];

type InvestmentAccount = {
  id: string;
  plan_id: string;
  status: string;
  amount_usd: number | string | null;
  current_value_usd: number | string | null;
  projected_return_pct: number | string | null;
  profit_mode: ProfitMode;
  shield_mode: ShieldMode;
  duration_days: number;
  created_at: string;
  matures_at?: string | null;
};

function firstNumber(row: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!row) return 0;
  for (const key of keys) {
    const value = row[key];
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(num)) return num;
  }
  return 0;
}

function isPlanId(value: string | null): value is PlanId {
  return (
    value === 'preserve' ||
    value === 'grow' ||
    value === 'accelerate' ||
    value === 'private-wealth'
  );
}

export default function DashboardInvestmentsPage() {
  const { user } = useStore();
  const searchParams = useSearchParams();
  const router = useRouter(); // ← NEW: for navigating to wallet withdraw

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([]);

  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('grow');
  const [amount, setAmount] = useState(5000);
  const [profitMode, setProfitMode] = useState<ProfitMode>('compound');
  const [shieldMode, setShieldMode] = useState<ShieldMode>('partial');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedPlan = useMemo(
    () => investmentPlans.find((plan) => plan.id === selectedPlanId) ?? investmentPlans[1],
    [selectedPlanId]
  );

  const spendableBalance = Math.max(0, walletBalance - lockedBalance);

  const dailyExpectedIncrement = useMemo(() => {
    return amount * (selectedPlan.dailyYield / 100);
  }, [amount, selectedPlan.dailyYield]);

  const expectedReturn = useMemo(() => {
    return amount * (selectedPlan.roi / 100);
  }, [amount, selectedPlan.roi]);

  useEffect(() => {
    const queryPlan = searchParams.get('plan');
    if (isPlanId(queryPlan)) {
      setSelectedPlanId(queryPlan);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    void loadData();
  }, [user?.id]);

  useEffect(() => {
    const clampedMin = Math.max(selectedPlan.minInvestment, amount || 0);
    const clampedFinal =
      selectedPlan.maxInvestment !== null
        ? Math.min(clampedMin, selectedPlan.maxInvestment)
        : clampedMin;

    setAmount(clampedFinal);
    setProfitMode(selectedPlan.allowedProfitModes[0]);
    setShieldMode(selectedPlan.allowedShieldModes[0]);
  }, [selectedPlanId]);

  const loadData = async () => {
    if (!user?.id) return;

    if (!isSupabaseConfigured()) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [{ data: userRow, error: userError }, { data: planAccounts, error: accountsError }] =
        await Promise.all([
          supabase
            .from('users')
            .select('id, balance, balance_available, balance_locked, balance_bonus')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('user_investment_accounts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

      if (userError) throw userError;
      if (accountsError) throw accountsError;

      const balanceAvailable = firstNumber(userRow as Record<string, unknown>, [
        'balance_available',
        'balance',
      ]);
      const balanceLocked = firstNumber(userRow as Record<string, unknown>, ['balance_locked']);

      setWalletBalance(balanceAvailable);
      setLockedBalance(balanceLocked);
      setAccounts((planAccounts ?? []) as InvestmentAccount[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load investment data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async () => {
    // ... (unchanged - same as previous version)
    if (!user?.id) return;

    const numericAmount = Number(amount || 0);

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Enter a valid allocation amount');
      }

      if (numericAmount < selectedPlan.minInvestment) {
        throw new Error(
          `Minimum allocation for ${selectedPlan.name} is $${selectedPlan.minInvestment.toLocaleString()}`
        );
      }

      if (
        selectedPlan.maxInvestment !== null &&
        numericAmount > selectedPlan.maxInvestment
      ) {
        throw new Error(
          `Maximum allocation for ${selectedPlan.name} is $${selectedPlan.maxInvestment.toLocaleString()}`
        );
      }

      if (numericAmount > spendableBalance) {
        throw new Error('Allocation amount exceeds available balance');
      }

      const res = await fetch('/api/investments/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          userId: user.id,
          planId: selectedPlan.id,
          amountUsd: numericAmount,
          profitMode,
          shieldMode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Allocation failed');
      }

      if (typeof data?.result?.newBalanceAvailable !== 'undefined') {
        setWalletBalance(Number(data.result.newBalanceAvailable || 0));
      }

      setMessage(`$${numericAmount.toLocaleString()} allocated to ${selectedPlan.name}`);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Allocation failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // NEW: Withdraw handler – takes user to wallet withdraw section (stylized navigation)
  const handleWithdraw = (account: InvestmentAccount) => {
    const plan = investmentPlans.find((p) => p.id === account.plan_id);
    const withdrawAmount = Number(account.current_value_usd || account.amount_usd || 0);

    // Navigate to wallet withdraw section with pre-filled data via query params
    const params = new URLSearchParams({
      tab: 'withdraw',                    // or section=withdraw depending on your wallet page
      source: 'investment',
      accountId: account.id,
      planName: plan?.name || account.plan_id,
      amount: withdrawAmount.toString(),
    });

    router.push(`/dashboard/wallet?${params.toString()}`);
  };

  const totalInvested = accounts.reduce(
    (sum, account) => sum + Number(account.amount_usd || 0),
    0
  );

  const totalCurrentValue = accounts.reduce(
    (sum, account) => sum + Number(account.current_value_usd || 0),
    0
  );

  const projectedPortfolioReturn = accounts.reduce((sum, account) => {
    const base = Number(account.amount_usd || 0);
    const pct = Number(account.projected_return_pct || 0);
    return sum + base * (pct / 100);
  }, 0);

  return (
    <KYCGate action="allocate funds into investment plans">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-cream">Investment Plans</h1>
            <p className="text-sm text-cream/50">
              Allocate from your wallet balance into managed strategy plans • Daily price increments
            </p>
          </div>
        </div>

        {/* Stats unchanged */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Wallet Balance',
              value: `$${walletBalance.toLocaleString()}`,
              icon: Wallet,
              color: 'text-electric',
            },
            {
              label: 'Spendable Now',
              value: `$${spendableBalance.toLocaleString()}`,
              icon: Shield,
              color: 'text-gold',
            },
            {
              label: 'Active Plans',
              value: accounts.length,
              icon: BarChart3,
              color: 'text-profit',
            },
            {
              label: 'Current Portfolio Value',
              value: `$${(totalCurrentValue + projectedPortfolioReturn).toLocaleString()}`,
              icon: Percent,
              color: 'text-purple-400',
            },
          ].map((stat, index) => (
            <div key={index} className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-cream/50">{stat.label}</span>
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-loss/10 border border-loss/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-loss flex-shrink-0 mt-0.5" />
            <p className="text-sm text-cream/80">{error}</p>
          </div>
        )}

        {message && (
          <div className="p-4 bg-profit/10 border border-profit/20 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-profit flex-shrink-0 mt-0.5" />
            <p className="text-sm text-cream/80">{message}</p>
          </div>
        )}

        <div className="grid xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            {/* Plan cards unchanged */}
            <div className="grid md:grid-cols-2 gap-4">
              {investmentPlans.map((plan, index) => (
                <motion.button
                  key={plan.id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative text-left p-5 rounded-2xl border transition-all ${
                    selectedPlanId === plan.id
                      ? `${plan.borderColor} bg-white/10 ring-1 ring-white/10`
                      : `${plan.borderColor} bg-white/5 hover:bg-white/[0.07]`
                  }`}
                >
                  {/* ... rest of plan card unchanged (same as previous version) */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-5 px-3 py-1 bg-profit text-void text-[10px] font-bold rounded-full">
                      MOST BALANCED
                    </div>
                  )}

                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}
                  >
                    <plan.icon className="w-6 h-6 text-white" />
                  </div>

                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-lg font-bold text-cream">{plan.name}</h3>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-cream/60">
                      {plan.riskLabel}
                    </span>
                  </div>

                  <p className="text-sm text-cream/50 mb-4">{plan.description}</p>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="p-3 bg-white/5 rounded-xl">
                      <div className="text-cream/40 text-xs mb-1">Min Allocation</div>
                      <div className="text-cream font-semibold">
                        ${plan.minInvestment.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl">
                      <div className="text-cream/40 text-xs mb-1">Daily Yield</div>
                      <div className="text-profit font-semibold">+{plan.dailyYield.toFixed(3)}%</div>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs">
                        <CheckCircle className="w-3.5 h-3.5 text-profit flex-shrink-0" />
                        <span className="text-cream/70">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </motion.button>
              ))}
            </div>

            {/* Allocate section unchanged */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
              {/* ... same allocate UI as previous version ... */}
              <div className="flex items-center gap-3 mb-6">
                <Calculator className="w-6 h-6 text-gold" />
                <div>
                  <h2 className="text-xl font-bold text-cream">Allocate to Plan</h2>
                  <p className="text-sm text-cream/50">
                    This moves funds from your dashboard balance into the selected strategy. You receive the exact promised ROI as daily price increments.
                  </p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-5">
                  {/* wallet balance, amount input, profit mode, shield mode, allocate button – unchanged */}
                  {/* ... (copy from previous version) ... */}
                  <div>
                    <label className="block text-xs font-medium text-cream/50 mb-2">
                      Available Wallet Balance
                    </label>
                    <div className="p-4 rounded-xl bg-electric/10 border border-electric/20">
                      <p className="text-2xl font-bold text-electric">
                        ${walletBalance.toLocaleString()}
                      </p>
                      <p className="text-xs text-cream/50 mt-1">
                        Allocation will be deducted from this balance
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-cream/50 mb-2">
                      Allocation Amount (USD)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) =>
                        setAmount(Math.max(selectedPlan.minInvestment, Number(e.target.value) || 0))
                      }
                      min={selectedPlan.minInvestment}
                      max={selectedPlan.maxInvestment || undefined}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream outline-none focus:border-gold"
                    />
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {[1000, 5000, 10000, 25000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setAmount(
                              Math.max(
                                selectedPlan.minInvestment,
                                selectedPlan.maxInvestment !== null
                                  ? Math.min(preset, selectedPlan.maxInvestment)
                                  : preset
                              )
                            )
                          }
                          className={`px-3 py-1 text-xs rounded-lg transition-all ${
                            amount ===
                            Math.max(
                              selectedPlan.minInvestment,
                              selectedPlan.maxInvestment !== null
                                ? Math.min(preset, selectedPlan.maxInvestment)
                                : preset
                            )
                              ? 'bg-gold text-void'
                              : 'bg-white/5 text-cream/50 hover:bg-white/10'
                          }`}
                        >
                          ${preset.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-cream/50 mb-2">
                      Profit Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedPlan.allowedProfitModes.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setProfitMode(mode)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                            profitMode === mode
                              ? 'border-gold bg-gold/10 text-gold'
                              : 'border-white/10 bg-white/5 text-cream/50'
                          }`}
                        >
                          {mode === 'compound'
                            ? 'Compound'
                            : mode === 'monthly_payout'
                              ? 'Monthly'
                              : 'Hybrid'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-cream/50 mb-2">
                      Shield Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedPlan.allowedShieldModes.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setShieldMode(mode)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                            shieldMode === mode
                              ? 'border-profit bg-profit/10 text-profit'
                              : 'border-white/10 bg-white/5 text-cream/50'
                          }`}
                        >
                          {mode === 'off' ? 'Off' : mode === 'partial' ? 'Partial' : 'Full'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAllocate}
                    disabled={submitting || amount > spendableBalance}
                    className="w-full py-3 bg-gold text-void font-semibold rounded-xl hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Allocating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Transfer from Balance to Plan
                      </>
                    )}
                  </button>

                  {amount > spendableBalance && (
                    <p className="text-xs text-loss flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5" />
                      Insufficient spendable wallet balance for this allocation
                    </p>
                  )}
                </div>

                <div className="p-5 bg-gradient-to-br from-gold/10 to-transparent rounded-2xl border border-gold/20">
                  <h3 className="text-lg font-semibold text-cream mb-4">
                    {selectedPlan.name} Summary
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-cream/50">Allocated Capital</span>
                      <span className="text-cream font-mono">
                        ${amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cream/50">Daily Price Increment</span>
                      <span className="text-profit font-mono">
                        +${dailyExpectedIncrement.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cream/50">Plan Duration</span>
                      <span className="text-cream">{selectedPlan.durationLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cream/50">Profit Mode</span>
                      <span className="text-cream">
                        {profitMode === 'compound'
                          ? 'Compound'
                          : profitMode === 'monthly_payout'
                            ? 'Monthly Payout'
                            : 'Hybrid'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cream/50">Shield</span>
                      <span className="text-cream capitalize">{shieldMode}</span>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-cream font-medium">Today&apos;s Projected Value</span>
                        <span className="text-2xl font-bold text-gold">
                          ${(amount + dailyExpectedIncrement).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-xs text-cream/60">
                      You receive the exact promised ROI as daily price increments on your account value. No waiting for maturity — the price updates every day.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* How it works – updated with withdrawal info */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-profit" />
                <h3 className="font-bold text-cream">How this works</h3>
              </div>
              <div className="space-y-3 text-sm text-cream/60">
                <div className="flex gap-3">
                  <div className="text-gold font-bold">1</div>
                  <p>Deposit funds into your main wallet first.</p>
                </div>
                <div className="flex gap-3">
                  <div className="text-gold font-bold">2</div>
                  <p>Select a plan and choose how much to allocate from balance.</p>
                </div>
                <div className="flex gap-3">
                  <div className="text-gold font-bold">3</div>
                  <p>Your wallet balance decreases and your investment account is funded instantly.</p>
                </div>
                <div className="flex gap-3">
                  <div className="text-gold font-bold">4</div>
                  <p>Every day the account value increases by the exact daily price increment.</p>
                </div>
                <div className="flex gap-3">
                  <div className="text-gold font-bold">5</div>
                  <p>Withdraw anytime — funds return to your wallet instantly via the Wallet section.</p>
                </div>
              </div>
            </div>

            {/* Active Investment Accounts – NOW WITH STYLIZED WITHDRAW BUTTON */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-electric" />
                <h3 className="font-bold text-cream">Active Investment Accounts</h3>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-electric animate-spin" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-10">
                  <Wallet className="w-10 h-10 text-cream/20 mx-auto mb-3" />
                  <p className="text-sm text-cream/40">No investment accounts yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => {
                    const plan = investmentPlans.find((p) => p.id === account.plan_id);
                    const allocated = Number(account.amount_usd || 0);
                    const currentValue = Number(account.current_value_usd || 0);
                    const estDailyIncrement = allocated * ((plan?.dailyYield || 0) / 100);

                    return (
                      <div
                        key={account.id}
                        className="p-4 bg-white/5 rounded-xl border border-white/10"
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <p className="font-semibold text-cream">
                              {plan?.name ?? account.plan_id}
                            </p>
                            <p className="text-xs text-cream/40 uppercase">{account.status}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-cream/20" />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                          <div>
                            <p className="text-cream/40">Allocated</p>
                            <p className="text-cream font-medium">
                              ${allocated.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-cream/40">Current Value</p>
                            <p className="text-profit font-medium">
                              ${currentValue.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-cream/40">Today&apos;s Price Increment</p>
                            <p className="text-profit font-medium">
                              +${estDailyIncrement.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-cream/40">Shield</p>
                            <p className="text-cream font-medium capitalize">
                              {account.shield_mode}
                            </p>
                          </div>
                        </div>

                        {/* Stylized Withdraw Button */}
                        <button
                          onClick={() => handleWithdraw(account)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-transparent border border-gold/70 hover:border-gold text-gold hover:bg-gold/10 rounded-xl text-sm font-medium transition-all"
                        >
                          <ArrowDownCircle className="w-4 h-4" />
                          Withdraw from Plan
                        </button>

                        {account.matures_at && (
                          <p className="mt-3 text-[11px] text-cream/35">
                            Matures: {new Date(account.matures_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-loss/10 border border-loss/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-loss flex-shrink-0 mt-0.5" />
              <p className="text-sm text-cream/70">
                Projected returns are illustrative only. All allocations carry market risk. You can withdraw your full current value anytime from the Wallet section.
              </p>
            </div>
          </div>
        </div>
      </div>
    </KYCGate>
  );
}