// lib/types.ts
// ============================================================================
// SHARED APP TYPES
// Demo FX types + landing / marketing data types
// ============================================================================

// ─── DEMO FX PAIRS ───────────────────────────────────────────────────────────

export type DemoFxPairMode = 'manual' | 'scenario' | 'session';

export interface DemoFxPair {
  id: string;
  symbol: string;
  name: string;
  base_currency: string;
  quote_currency: string;
  pip_size: number;
  spread: number;
  default_bid: number;
  default_ask: number;
  current_bid: number;
  current_ask: number;
  mode: DemoFxPairMode;
  active_scenario_id: string | null;
  active_session_id?: string | null;
  is_active: boolean;
  display_order: number;
  price_updated_at: string;
  created_at: string;
  updated_at: string;
}

// ─── DEMO FX SCENARIOS ───────────────────────────────────────────────────────

export type ScenarioStatus =
  | 'draft'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'stopped';

export interface DemoFxScenario {
  id: string;
  pair_id: string;
  name: string;
  description: string | null;
  status: ScenarioStatus;
  scheduled_at: string | null;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  current_step_index: number;
  elapsed_ms: number;
  loop_playback: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  steps?: DemoFxScenarioStep[];
  pair?: DemoFxPair;
}

export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface DemoFxScenarioStep {
  id: string;
  scenario_id: string;
  step_index: number;
  offset_ms: number;
  target_bid: number;
  target_ask: number;
  easing: EasingType;
  label: string | null;
  created_at: string;
}

// ─── DEMO FX SESSIONS ────────────────────────────────────────────────────────

export type DemoFxSessionStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'stopped';

export type DemoFxSessionType = 'bullish' | 'bearish' | 'range' | 'custom';

export interface DemoFxSession {
  id: string;
  pair_id: string;
  session_type: DemoFxSessionType | string;
  duration_ms: number;
  tick_interval_ms: number;
  volatility: number;
  start_bid: number;
  start_ask: number;
  target_bid: number;
  target_ask: number;
  status: DemoFxSessionStatus;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  elapsed_ms: number;
  tick_seq: number;
  lesson_title: string | null;
  lesson_description: string | null;
  student_instructions: string | null;
  created_by: string | null;
  created_at: string;
  updated_at?: string;
  demo_fx_pairs?: Pick<DemoFxPair, 'symbol' | 'name'> | null;
}

// ─── DEMO FX TRADES ──────────────────────────────────────────────────────────

export type DemoTradeStatus =
  | 'open'
  | 'closed'
  | 'liquidated'
  | 'stopped_out'
  | 'take_profit';

export type CloseReason =
  | 'manual'
  | 'stop_loss'
  | 'take_profit'
  | 'liquidation'
  | 'admin';

export interface DemoFxTrade {
  id: string;
  user_id: string;
  pair_id: string;
  symbol: string;
  direction: 1 | -1;
  direction_label: 'buy' | 'sell';
  investment: number;
  multiplier: number;
  volume: number;
  entry_bid: number;
  entry_ask: number;
  entry_price: number;
  stop_loss: number | null;
  take_profit: number | null;
  liquidation_price: number | null;
  current_price: number | null;
  floating_pnl: number;
  status: DemoTradeStatus;
  close_reason: CloseReason | null;
  exit_price: number | null;
  final_pnl: number | null;
  closed_at: string | null;
  spread_cost: number;
  opened_at: string;
  updated_at: string;
}

// ─── DEMO FX TICKS / PRICE LOG ──────────────────────────────────────────────

export type DemoFxTickSource = 'scenario' | 'session' | 'manual' | 'system';

export interface DemoFxTick {
  id: string;
  pair_id: string;
  session_id?: string | null;
  scenario_id?: string | null;
  bid: number;
  ask: number;
  mid: number;
  source: DemoFxTickSource;
  seq: number;
  ts: string;
}

export interface DemoFxPriceLog {
  id: number;
  pair_id: string;
  bid: number;
  ask: number;
  source: DemoFxTickSource;
  logged_at: string;
}

// ─── DEMO FX API TYPES ──────────────────────────────────────────────────────

export interface OpenDemoTradeRequest {
  pair_id: string;
  direction: 'buy' | 'sell';
  investment: number;
  multiplier?: number;
  stop_loss?: number;
  take_profit?: number;
}

export interface CloseDemoTradeRequest {
  trade_id: string;
  reason?: 'manual';
}

export interface ScenarioControlAction {
  action: 'start' | 'pause' | 'resume' | 'stop' | 'schedule';
  scheduled_at?: string;
}

export interface SessionControlAction {
  action: 'start' | 'pause' | 'resume' | 'stop';
}

export interface ManualPriceOverride {
  pair_id: string;
  bid: number;
  ask: number;
}

export interface ScenarioStepInput {
  step_index: number;
  offset_ms: number;
  target_bid: number;
  target_ask: number;
  easing?: EasingType;
  label?: string;
}

// ─── DEMO FX INTERPOLATION ──────────────────────────────────────────────────

export interface InterpolatedTick {
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;
  step_from: number;
  step_to: number;
  progress: number;
}

// ─── USER DEPOSIT WALLET ────────────────────────────────────────────────────

export interface UserDepositWallet {
  id: string;
  user_id: string;
  currency: string;
  network: string;
  address: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── DEMO FX CHART DATA ─────────────────────────────────────────────────────

export interface DemoFxCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── LANDING / MARKETING DATA TYPES ─────────────────────────────────────────

export type MarketAssetType = 'crypto' | 'forex' | 'stock' | 'commodity' | string;

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  type: MarketAssetType;

  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  payout: number;

  marketCap?: number;

  // alias fields used elsewhere in UI
  change?: number;
  change_percent?: number;
  market_cap?: number;
  volume?: number;
  icon?: string;
  image?: string;
  category?: string;
  description?: string;
}

export interface Trader {
  id: string;
  name: string;
  avatar: string;

  totalReturn: number;
  winRate: number;
  followers: number;
  trades: number;
  riskScore: number;
  assets: string[];
  bio: string;
  verified: boolean;

  // optional alias / extra fields some components may reference
  username?: string;
  pnl?: number;
  profit?: number;
  win_rate?: number;
  country?: string;
  rank?: number;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: string;

  href?: string;
  cta?: string;
  image?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  content: string;
  profit: number;
  rating: number;

  company?: string;
  image?: string;
  location?: string;
}

export interface PlatformStats {
  totalUsers: number;
  totalVolume: number;
  totalCountries: number;
  uptime: number;

  // optional extras if other parts of app reference them
  traders?: number;
  trades?: number;
  volume?: number;
  assets?: number;
  revenue?: number;
}