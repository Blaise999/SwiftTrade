'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Shield,
  Clock,
  Percent,
  Unlock,
  ArrowRight,
  Calculator,
  AlertCircle,
  CheckCircle,
  Wallet,
  PiggyBank,
  Building,
  Rocket,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useStore } from '@/lib/supabase/store-supabase';

const investmentPlans = [
  {
    id: 'preserve',
    name: 'Preserve Plan',
    description: 'Protection-first strategy built for smoother performance and lower volatility.',
    minInvestment: 1000,
    maxInvestment: 4999,
    roi: 5,
    duration: 30,
    durationLabel: '30 Days',
    payoutFrequency: 'Monthly or End of term',
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
  },
  {
    id: 'grow',
    name: 'Grow Plan',
    description: 'Balanced multi-asset strategy for users seeking steady growth with controlled risk.',
    minInvestment: 5000,
    maxInvestment: 9999,
    roi: 12,
    duration: 60,
    durationLabel: '60 Days',
    payoutFrequency: 'Monthly / Hybrid',
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
  },
  {
    id: 'accelerate',
    name: 'Accelerate Plan',
    description: 'Higher-growth strategy for users comfortable with more active market exposure.',
    minInvestment: 10000,
    maxInvestment: 24999,
    roi: 20,
    duration: 90,
    durationLabel: '90 Days',
    payoutFrequency: 'Compounding or Monthly',
    features: [
      'Growth-focused allocation',
      'Advanced Shield controls',
      'Crypto and FX weighted strategy',
      'Compounding option available',
      'Dedicated account support',
      'Enhanced portfolio tracking',
    ],
    icon: Rocket,
    color: 'from-gold to-yellow-600',
    borderColor: 'border-gold/30',
    popular: false,
  },
  {
    id: 'private-wealth',
    name: 'Private Wealth',
    description: 'Premium plan for larger balances, tailored allocation, and deeper portfolio control.',
    minInvestment: 25000,
    maxInvestment: null,
    roi: 35,
    duration: 180,
    durationLabel: '180 Days',
    payoutFrequency: 'Custom payout structure',
    features: [
      'Custom portfolio configuration',
      'Priority processing and support',
      'Flexible Shield logic',
      'Advanced reporting',
      'High-balance account management',
      'Private onboarding experience',
    ],
    icon: Building,
    color: 'from-purple-500 to-pink-600',
    borderColor: 'border-purple-500/30',
    popular: false,
  },
];

export default function InvestmentPlansPage() {
  const { isAuthenticated } = useStore();
  const router = useRouter();
  const [investAmount, setInvestAmount] = useState(5000);
  const [calculatorPlan, setCalculatorPlan] = useState(investmentPlans[1]);

  const handleStartInvesting = (planId: string) => {
    if (isAuthenticated) {
      router.push(`/dashboard/wallet?plan=${planId}`);
    } else {
      router.push(`/auth/signup?redirect=/dashboard/wallet&plan=${planId}`);
    }
  };

  const calculateReturn = (amount: number, roi: number) => {
    return amount * (roi / 100);
  };

  const expectedReturn = calculateReturn(investAmount, calculatorPlan.roi);

  return (
    <div className="min-h-screen bg-void">
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 border border-gold/20 rounded-full mb-6">
              <TrendingUp className="w-4 h-4 text-gold" />
              <span className="text-gold text-sm font-medium">Managed Strategy Plans</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-cream mb-6">
              Investment Plans
              <br />
              <span className="gradient-text-gold">Built Around Your Risk Style</span>
            </h1>
            <p className="text-lg text-cream/60 max-w-2xl mx-auto">
              Choose a strategy plan based on how you want your capital managed —
              from capital preservation to higher-growth positioning with optional Shield protection.
            </p>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-16">
            {[
              { icon: Shield, text: 'Shield Protection Available', color: 'text-profit' },
              { icon: Clock, text: 'Flexible Durations', color: 'text-gold' },
              { icon: Unlock, text: 'Structured Payout Options', color: 'text-electric' },
            ].map((badge, index) => (
              <div key={index} className="flex items-center gap-2 text-cream/60">
                <badge.icon className={`w-5 h-5 ${badge.color}`} />
                <span className="text-sm">{badge.text}</span>
              </div>
            ))}
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {investmentPlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-6 rounded-2xl border ${plan.borderColor} ${
                  plan.popular ? 'bg-gradient-to-b from-profit/10 to-transparent' : 'bg-white/5'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-profit text-void text-xs font-bold rounded-full">
                    MOST BALANCED
                  </div>
                )}

                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}
                >
                  <plan.icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl font-bold text-cream mb-1">{plan.name}</h3>
                <p className="text-sm text-cream/50 mb-4">{plan.description}</p>

                {/* ROI */}
                <div className="p-4 bg-white/5 rounded-xl mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-cream/50 text-sm">Projected Return Scenario</span>
                    <Percent className="w-4 h-4 text-gold" />
                  </div>
                  <span className="text-3xl font-bold text-profit">+{plan.roi}%</span>
                  <span className="text-cream/50 text-sm ml-2">over {plan.durationLabel}</span>
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <span className="text-sm text-profit/80 font-medium">
                      ~{(plan.roi / plan.duration).toFixed(3)}%/day
                    </span>
                    <span className="text-cream/40 text-xs ml-1.5">credited daily</span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cream/50">Min Allocation</span>
                    <span className="text-cream font-medium">${plan.minInvestment.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cream/50">Max Allocation</span>
                    <span className="text-cream font-medium">
                      {plan.maxInvestment ? `$${plan.maxInvestment.toLocaleString()}` : 'Unlimited'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-cream/50">Payout Style</span>
                    <span className="text-cream font-medium">{plan.payoutFrequency}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {plan.features.slice(0, 4).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-profit flex-shrink-0" />
                      <span className="text-cream/70">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleStartInvesting(plan.id)}
                  className={`block w-full py-3 text-center font-semibold rounded-xl transition-all ${
                    plan.popular
                      ? 'bg-profit text-void hover:bg-profit/90'
                      : 'bg-white/10 text-cream hover:bg-white/20'
                  }`}
                >
                  Start Plan
                </button>
              </motion.div>
            ))}
          </div>

          {/* ROI Calculator */}
          <div className="bg-white/5 rounded-2xl border border-white/10 p-8 mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Calculator className="w-6 h-6 text-gold" />
              <h2 className="text-2xl font-bold text-cream">Investment Calculator</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-cream/70 mb-2">
                    Select Plan
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {investmentPlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => {
                          setCalculatorPlan(plan);
                          setInvestAmount((current) => Math.max(plan.minInvestment, current));
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          calculatorPlan.id === plan.id
                            ? 'border-gold bg-gold/10'
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-sm text-cream font-medium">{plan.name}</span>
                        <span className="block text-xs text-profit">+{plan.roi}% projection</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-cream/70 mb-2">
                    Investment Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/50">$</span>
                    <input
                      type="number"
                      value={investAmount}
                      onChange={(e) =>
                        setInvestAmount(
                          Math.max(calculatorPlan.minInvestment, parseInt(e.target.value) || 0)
                        )
                      }
                      min={calculatorPlan.minInvestment}
                      max={calculatorPlan.maxInvestment || undefined}
                      className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream text-lg focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {[1000, 5000, 10000, 25000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setInvestAmount(Math.max(calculatorPlan.minInvestment, amount))}
                        className={`px-3 py-1 text-xs rounded-lg transition-all ${
                          investAmount === Math.max(calculatorPlan.minInvestment, amount)
                            ? 'bg-gold text-void'
                            : 'bg-white/5 text-cream/50 hover:bg-white/10'
                        }`}
                      >
                        ${amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-br from-gold/10 to-transparent rounded-xl border border-gold/20">
                <h3 className="text-lg font-semibold text-cream mb-4">Projected Outcome</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-cream/50">Allocated Capital</span>
                    <span className="text-cream font-mono">${investAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cream/50">Projected Return ({calculatorPlan.roi}%)</span>
                    <span className="text-profit font-mono">+${expectedReturn.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cream/50">Daily Return</span>
                    <span className="text-profit/80 font-mono">
                      +${(expectedReturn / calculatorPlan.duration).toFixed(2)}/day
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cream/50">Duration</span>
                    <span className="text-cream">{calculatorPlan.durationLabel}</span>
                  </div>
                  <div className="border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-cream font-medium">Projected Value</span>
                      <span className="text-2xl font-bold text-gold">
                        ${(investAmount + expectedReturn).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleStartInvesting(calculatorPlan.id)}
                  className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-gold text-void font-semibold rounded-xl hover:bg-gold/90 transition-all"
                >
                  Start Plan Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold text-cream mb-8">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  step: 1,
                  title: 'Choose Plan',
                  description: 'Pick a strategy plan that matches your risk style and capital level.',
                  icon: TrendingUp,
                },
                {
                  step: 2,
                  title: 'Allocate Funds',
                  description: 'Move funds from your wallet into your selected plan account.',
                  icon: Wallet,
                },
                {
                  step: 3,
                  title: 'Track Performance',
                  description: 'Monitor projected growth, asset behavior, and Shield status in real time.',
                  icon: Percent,
                },
                {
                  step: 4,
                  title: 'Payout or Compound',
                  description: 'Choose to withdraw returns or keep them compounding based on your plan.',
                  icon: Unlock,
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-16 h-16 bg-gold/10 border border-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-8 h-8 text-gold" />
                  </div>
                  <div className="text-xs text-gold mb-2">Step {item.step}</div>
                  <h3 className="text-cream font-medium mb-1">{item.title}</h3>
                  <p className="text-sm text-cream/50">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Notice */}
          <div className="p-4 bg-loss/10 border border-loss/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-loss flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-cream/70">
                <strong className="text-cream">Risk Disclosure:</strong> These plans are structured
                around portfolio strategy, duration, and risk profile. Projected returns shown in the
                calculator are illustrative only and do not guarantee future performance. All investing
                involves risk, and users should review the full risk disclosure before allocating funds.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}