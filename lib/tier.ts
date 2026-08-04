import { Crown, Zap, Rocket } from 'lucide-react';

export type TierDef = {
  code: 'starter' | 'trader' | 'elite';
  name: string;
  price: number;
  tagline: string;
  icon: any;
  accent: string;
  perks: string[];
  featured?: boolean;
};

export const TIERS: TierDef[] = [
  {
    code: 'starter',
    name: 'Starter',
    price: 500,
    tagline: 'Get in the game',
    icon: Rocket,
    accent: '#5B9BFF',
    perks: [
      'US stocks, ETFs & crypto trading',
      '$10,000 daily trading limit',
      'SwiftBridge access (standard queue)',
      'Standard email support',
    ],
  },
  {
    code: 'trader',
    name: 'Trader',
    price: 1000,
    tagline: 'Trade like a pro',
    icon: Zap,
    accent: '#00E676',
    featured: true,
    perks: [
      'Everything in Starter',
      'FX trading unlocked',
      '$50,000 daily trading limit',
      'Shield mode on every position',
      'Priority support',
    ],
  },
  {
    code: 'elite',
    name: 'Elite',
    price: 2000,
    tagline: 'The whole vault',
    icon: Crown,
    accent: '#9B7CFF',
    perks: [
      'Everything in Trader',
      'Unlimited trading limits',
      'Auto-Shield + SwiftBridge priority',
      'Lowest fees on the platform',
      'VIP concierge (24/7)',
    ],
  },
];