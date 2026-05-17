import {
  PiggyBank,
  TrendingUp,
  Rocket,
  Building,
  type LucideIcon,
} from 'lucide-react';

export type InvestmentPlanId =
  | 'preserve'
  | 'grow'
  | 'accelerate'
  | 'private-wealth';

export type ShieldMode = 'off' | 'partial' | 'full';
export type ProfitMode = 'compound' | 'monthly_payout' | 'hybrid';
export type RiskLevel = 'low' | 'medium' | 'high' | 'custom';

export type InvestmentPlan = {
  id: InvestmentPlanId;
  name: string;
  description: string;
  minInvestment: number;
  maxInvestment: number | null;
  projectedReturnPct: number;
  durationDays: number;
  durationLabel: string;
  payoutFrequencyLabel: string;
  riskLevel: RiskLevel;
  supportsShield: boolean;
  allowedShieldModes: ShieldMode[];
  allowedProfitModes: ProfitMode[];
  features: string[];
  popular?: boolean;
  color: string;
  borderColor: string;
  icon: LucideIcon;
};

export const INVESTMENT_PLANS: InvestmentPlan[] = [
  {
    id: 'preserve',
    name: 'Preserve Plan',
    description:
      'Protection-first strategy built for smoother performance and lower volatility.',
    minInvestment: 1000,
    maxInvestment: 4999,
    projectedReturnPct: 5,
    durationDays: 30,
    durationLabel: '30 Days',
    payoutFrequencyLabel: 'Monthly or End of term',
    riskLevel: 'low',
    supportsShield: true,
    allowedShieldModes: ['partial', 'full'],
    allowedProfitModes: ['compound', 'monthly_payout'],
    features: [
      'Capital preservation focused',
      'Shield protection available',
      'Lower-volatility portfolio mix',
      'Flexible or fixed duration',
    ],
    color: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-500/20',
    icon: PiggyBank,
  },
  {
    id: 'grow',
    name: 'Grow Plan',
    description:
      'Balanced multi-asset strategy for users seeking steady growth with controlled risk.',
    minInvestment: 5000,
    maxInvestment: 9999,
    projectedReturnPct: 12,
    durationDays: 60,
    durationLabel: '60 Days',
    payoutFrequencyLabel: 'Monthly / Hybrid',
    riskLevel: 'medium',
    supportsShield: true,
    allowedShieldModes: ['off', 'partial', 'full'],
    allowedProfitModes: ['compound', 'monthly_payout', 'hybrid'],
    features: [
      'Balanced stocks, FX, and crypto mix',
      'Partial or Full Shield support',
      'Flexible payout structure',
      'Priority support',
      'Smart allocation model',
    ],
    color: 'from-profit to-emerald-600',
    borderColor: 'border-profit/20',
    icon: TrendingUp,
    popular: true,
  },
  {
    id: 'accelerate',
    name: 'Accelerate Plan',
    description:
      'Higher-growth strategy for users comfortable with more active market exposure.',
    minInvestment: 10000,
    maxInvestment: 24999,
    projectedReturnPct: 20,
    durationDays: 90,
    durationLabel: '90 Days',
    payoutFrequencyLabel: 'Compounding or Monthly',
    riskLevel: 'high',
    supportsShield: true,
    allowedShieldModes: ['off', 'partial', 'full'],
    allowedProfitModes: ['compound', 'monthly_payout', 'hybrid'],
    features: [
      'Growth-focused allocation',
      'Advanced Shield controls',
      'Crypto and FX weighted strategy',
      'Compounding option available',
      'Dedicated account support',
      'Enhanced portfolio tracking',
    ],
    color: 'from-gold to-yellow-600',
    borderColor: 'border-gold/30',
    icon: Rocket,
  },
  {
    id: 'private-wealth',
    name: 'Private Wealth',
    description:
      'Premium plan for larger balances, tailored allocation, and deeper portfolio control.',
    minInvestment: 25000,
    maxInvestment: null,
    projectedReturnPct: 35,
    durationDays: 180,
    durationLabel: '180 Days',
    payoutFrequencyLabel: 'Custom payout structure',
    riskLevel: 'custom',
    supportsShield: true,
    allowedShieldModes: ['off', 'partial', 'full'],
    allowedProfitModes: ['compound', 'monthly_payout', 'hybrid'],
    features: [
      'Custom portfolio configuration',
      'Priority processing and support',
      'Flexible Shield logic',
      'Advanced reporting',
      'High-balance account management',
      'Private onboarding experience',
    ],
    color: 'from-purple-500 to-pink-600',
    borderColor: 'border-purple-500/30',
    icon: Building,
  },
];

export function getInvestmentPlanById(id: string) {
  return INVESTMENT_PLANS.find((plan) => plan.id === id);
}