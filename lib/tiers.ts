/**
 * Tiers — single source of truth.
 *   - TIERS / TierDef: the display definitions (used by the tier page + checkout)
 *   - gating helpers:   which feature each tier unlocks (client-safe)
 * Server-side enforcement lives in lib/tier-guard.ts.
 *
 * Levels:  none/basic 0  <  starter 1  <  trader 2  <  elite 3
 */
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
    code: 'starter', name: 'Starter', price: 500, tagline: 'Get in the game', icon: Rocket, accent: '#5B9BFF',
    perks: [
      'US stocks, ETFs & crypto trading',
      '$10,000 daily trading limit',
      'SwiftBridge access (standard queue)',
      'Standard email support',
    ],
  },
  {
    code: 'trader', name: 'Trader', price: 1000, tagline: 'Trade like a pro', icon: Zap, accent: '#00E676', featured: true,
    perks: [
      'Everything in Starter',
      'FX trading unlocked',
      '$50,000 daily trading limit',
      'Shield mode on every position',
      'Priority support',
    ],
  },
  {
    code: 'elite', name: 'Elite', price: 2000, tagline: 'The whole vault', icon: Crown, accent: '#9B7CFF',
    perks: [
      'Everything in Trader',
      'Unlimited trading limits',
      'Auto-Shield + SwiftBridge priority',
      'Lowest fees on the platform',
      'VIP concierge (24/7)',
    ],
  },
];

// ── gating ──────────────────────────────────────────────────────────
export const TIER_LEVEL: Record<string, number> = {
  none: 0, basic: 0, free: 0,
  starter: 1,
  trader: 2,
  elite: 3,
};

export const TIER_BY_LEVEL = ['none', 'starter', 'trader', 'elite'];

export const TIER_PRICES: Record<string, number> = {
  starter: 500, trader: 1000, elite: 2000,
};

/**
 * Feature -> minimum tier level (by importance):
 *   Starter (1): trading + SwiftBridge
 *   Trader  (2): FX, Shield, bots
 *   Elite   (3): Auto-Shield, airdrops
 * Anything not listed is free (browsing, deposit, wallet, referrals, KYC).
 */
export const FEATURE_MIN_LEVEL: Record<string, number> = {
  trade: 1, trading: 1, bridge: 1,
  fx: 2, shield: 2, bots: 2, dca_bots: 2, grid_bots: 2, trading_bots: 2,
  auto_shield: 3, airdrop: 3, ai_assistant: 3, elite: 3,
};

export function tierLevel(code?: string | null): number {
  return TIER_LEVEL[String(code || 'none').toLowerCase()] ?? 0;
}

export function meetsFeature(userTierCode: string | null | undefined, feature: string): boolean {
  return tierLevel(userTierCode) >= (FEATURE_MIN_LEVEL[feature] ?? 0);
}

/** The tier code a user needs for a feature, e.g. 'trader'. */
export function requiredTierName(feature: string): string {
  return TIER_BY_LEVEL[FEATURE_MIN_LEVEL[feature] ?? 0] || 'starter';
}

/** Level -> display name. */
export function tierName(level: number): string {
  return ['Basic', 'Starter', 'Trader', 'Elite'][level] || 'Basic';
}

export function getTier(code: string): TierDef | undefined {
  return TIERS.find((t) => t.code === code);
}
