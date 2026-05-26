'use client';

/**
 * AUTH + ADMIN STORE (single source of truth)
 *
 * - useStore(): user auth + user actions
 * - useAdminStore(): admin actions
 * - useOtpStore(): alias of useStore (OTP temp fields)
 * - useKYCStore(): alias of useStore (KYC helpers)
 */

import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

// ============================================
// TIMEOUT + RETRY HELPERS
// ============================================
async function withTimeout<T>(p: PromiseLike<T>, ms = 20000): Promise<T> {
  return await Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error('__timeout__')), ms)
    ),
  ]);
}

/** Retry once on timeout */
async function withRetry<T>(fn: () => PromiseLike<T>, ms = 20000): Promise<T> {
  try {
    return await withTimeout(fn(), ms);
  } catch (err: any) {
    if (err?.message === '__timeout__') {
      // One retry with a longer window
      return await withTimeout(fn(), ms + 10000);
    }
    throw err;
  }
}

/** Turn developer/Supabase errors into friendly messages */
function humanError(raw: string | undefined | null): string {
  if (!raw) return 'Something went wrong. Please try again.';
  const m = raw.toLowerCase();
  if (m.includes('__timeout__') || m.includes('timeout'))
    return 'Connection is slow — please check your internet and try again.';
  if (m.includes('invalid login credentials'))
    return 'Incorrect email or password. Please try again.';
  if (m.includes('email not confirmed'))
    return 'Please check your inbox and verify your email first.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'This email is already registered. Try signing in instead.';
  if (m.includes('password') && m.includes('least'))
    return 'Password must be at least 6 characters.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch'))
    return 'Network error — please check your internet connection.';
  if (m.includes('rls') || m.includes('policy') || m.includes('permission'))
    return 'Something went wrong on our end. Please try again shortly.';
  if (m.includes('jwt') || m.includes('token'))
    return 'Your session expired. Please sign in again.';
  if (m.includes('user not found'))
    return 'No account found with that email.';
  if (m.includes('disabled') || m.includes('banned'))
    return 'This account has been suspended. Contact support for help.';
  if (m.includes('signup') && m.includes('disabled'))
    return 'New registrations are temporarily paused. Please try again later.';
  // Return original if short and not too technical, otherwise generic
  if (raw.length < 80 && !m.includes('supabase') && !m.includes('postgres') && !m.includes('rpc'))
    return raw;
  return 'Something went wrong. Please try again.';
}

// ============================================
// TYPES
// ============================================
export type RegistrationStatus =
  | 'pending_verification'
  | 'pending_kyc'
  | 'pending_wallet'
  | 'complete';

export type KycStatus =
  | 'none'
  | 'not_started'
  | 'pending'
  | 'in_review'
  | 'verified'
  | 'approved'
  | 'rejected'
  | 'declined'
  | string;

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  tier: 'basic' | 'starter' | 'trader' | 'professional' | 'elite' | 'pro' | 'vip';
  tierLevel: number;
  tierActive: boolean;
  balance: number;
  bonusBalance: number;
  totalDeposited: number;
  kycStatus: KycStatus;
  registrationStatus: RegistrationStatus;
  walletAddress?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Deposit {
  id: string;
  orderId: string;
  amount: number;
  method: string;
  methodName: string;
  transactionRef?: string;
  proofUrl?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  note?: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  pair: string;
  type: 'buy' | 'sell';
  side: 'long' | 'short';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  exitPrice?: number;
  leverage: number;
  marginUsed: number;
  status: 'open' | 'closed' | 'liquidated';
  pnl: number;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: string;
  closedAt?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'crypto' | 'bank' | 'processor';
  name: string;
  symbol?: string;
  network?: string;
  address?: string;
  icon?: string;
  minDeposit: number;
  fee?: string;
  enabled: boolean;
}

// ============================================
// HELPERS
// ============================================
function dbRowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email || '',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    phone: row.phone || undefined,
    avatarUrl: row.avatar_url || undefined,
    role: row.role || 'user',
    tier: row.tier_code || row.tier || 'basic',
    tierLevel: Number(row.tier_level ?? 0),
    tierActive: Boolean(row.tier_active),
    balance: Number(row.balance_available ?? 0) || 0,
    bonusBalance: Number(row.balance_bonus ?? 0) || 0,
    totalDeposited: Number(row.total_deposited ?? 0) || 0,
    kycStatus: row.kyc_status || 'none',
    registrationStatus: row.registration_status || 'complete',
    walletAddress: row.wallet_address || undefined,
    isActive: row.is_active !== false,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function getRegistrationRedirect(status: RegistrationStatus): string {
  switch (status) {
    case 'pending_verification':
      return '/auth/verify-otp';
    case 'pending_kyc':
      return '/kyc';
    case 'pending_wallet':
      return '/dashboard/connect-wallet';
    default:
      return '/dashboard';
  }
}

export function getRegistrationMessage(status: RegistrationStatus): string {
  switch (status) {
    case 'pending_verification':
      return 'Please verify your email to continue.';
    case 'pending_kyc':
      return 'Please complete identity verification.';
    case 'pending_wallet':
      return 'Connect your wallet to finish setup.';
    default:
      return '';
  }
}

// ============================================
// AUTH STORE INTERFACE
// ============================================
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  deposits: Deposit[];
  trades: Trade[];
  paymentMethods: PaymentMethod[];

  // ✅ OTP TEMP STATE (signup -> verify-otp)
  otpEmail: string;
  otpName: string;
  otpPassword: string;
  redirectUrl: string;

  setOtpEmail: (v: string) => void;
  setOtpName: (v: string) => void;
  setOtpPassword: (v: string) => void;
  setRedirectUrl: (v: string) => void;
  clearOtp: () => void;

  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; redirect?: string; error?: string }>;

  signup: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => Promise<{ success: boolean; error?: string }>;

  logout: () => Promise<void>;
  checkSession: () => Promise<void>;

  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  updateRegistrationStatus: (status: RegistrationStatus) => Promise<boolean>;
  updateKycStatus: (status: KycStatus) => Promise<boolean>;

  refreshUser: () => Promise<void>;

  loadDeposits: () => Promise<void>;
  loadTrades: () => Promise<void>;
  loadPaymentMethods: () => Promise<void>;

  submitDeposit: (deposit: {
    amount: number;
    method: string;
    methodName: string;
    transactionRef?: string;
    proofUrl?: string;
  }) => Promise<boolean>;

  clearError: () => void;
  getBalance: () => { available: number; bonus: number };
}

// ============================================
// AUTH STORE
// ============================================
export const useStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // ✅ Start true — prevents redirect before checkSession runs
  error: null,

  deposits: [],
  trades: [],
  paymentMethods: [],

  // ✅ OTP defaults
  otpEmail: '',
  otpName: '',
  otpPassword: '',
  redirectUrl: '/dashboard',

  setOtpEmail: (v) => set({ otpEmail: v }),
  setOtpName: (v) => set({ otpName: v }),
  setOtpPassword: (v) => set({ otpPassword: v }),
  setRedirectUrl: (v) => set({ redirectUrl: v }),
  clearOtp: () =>
    set({
      otpEmail: '',
      otpName: '',
      otpPassword: '',
      redirectUrl: '/dashboard',
    }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      if (!isSupabaseConfigured()) {
        const users = JSON.parse(localStorage.getItem('swifttrade_users') || '[]');
        const found = users.find(
          (u: any) => u.email === email.toLowerCase() && u.password === password
        );
        if (!found) return { success: false, error: 'Invalid email or password' };

        const { password: _pw, ...userWithoutPw } = found;

        // keep old behavior but also support sessionStorage fallback
        try {
          sessionStorage.setItem('swifttrade_session', JSON.stringify(userWithoutPw));
        } catch {}
        localStorage.setItem('swifttrade_session', JSON.stringify(userWithoutPw));

        set({ user: userWithoutPw, isAuthenticated: true });

        const status = (userWithoutPw.registrationStatus as RegistrationStatus) || 'complete';
        return { success: true, redirect: getRegistrationRedirect(status) };
      }

      const authRes = await withRetry(
        () => supabase.auth.signInWithPassword({ email, password }),
        20000
      );

      const authError = (authRes as any).error;
      const authData = (authRes as any).data;

      if (authError) {
        const msg = humanError(authError.message);
        set({ error: msg });
        return { success: false, error: msg };
      }

      if (!authData?.user) {
        set({ error: 'Unable to sign in right now. Please try again.' });
        return { success: false, error: 'Unable to sign in right now. Please try again.' };
      }

      const profileRes = await withTimeout(
        supabase.from('users').select('*').eq('id', authData.user.id).maybeSingle(),
        20000
      ).catch(() => ({ data: null, error: null }));

      const profileError = (profileRes as any).error;
      let profile = (profileRes as any).data;

      // If profile read failed (likely RLS), don't block login.
      // Try to proceed with what we have from auth.
      if (profileError) {
        console.warn('[login] Profile read failed:', profileError.message);
        // Still proceed — create a minimal profile object from auth data
      }

      if (!profile) {
        const insertRes = await withTimeout(
          supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: (authData.user.email || email).toLowerCase(),
              first_name: authData.user.user_metadata?.first_name || '',
              last_name: authData.user.user_metadata?.last_name || '',
              role: 'user',
              tier_code: 'basic',
              tier_level: 0,
              tier_active: false,
              balance_available: 0,
              balance_bonus: 0,
              total_deposited: 0,
              kyc_status: 'none',
              registration_status: 'pending_kyc',
              is_active: true,
            })
            .select()
            .single(),
          20000
        );

        const insertError = (insertRes as any).error;
        const newProfile = (insertRes as any).data;

        if (insertError || !newProfile) {
          // Don't block login — use minimal profile from auth data
          console.warn('[login] Profile insert failed:', insertError?.message);
          profile = {
            id: authData.user.id,
            email: (authData.user.email || email).toLowerCase(),
            first_name: authData.user.user_metadata?.first_name || '',
            last_name: authData.user.user_metadata?.last_name || '',
            role: 'user', tier_code: 'basic', tier_level: 0, tier_active: false,
            balance_available: 0, balance_bonus: 0, total_deposited: 0,
            kyc_status: 'none', registration_status: 'pending_kyc',
            is_active: true, created_at: new Date().toISOString(),
          };
        } else {
          profile = newProfile;
        }
      }

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        set({ error: 'This account has been suspended. Contact support for help.' });
        return { success: false, error: 'This account has been suspended. Contact support for help.' };
      }

      const user = dbRowToUser(profile);
      set({ user, isAuthenticated: true });
      return { success: true, redirect: getRegistrationRedirect(user.registrationStatus) };
    } catch (err: any) {
      const msg = humanError(err?.message);
      set({ error: msg });
      return { success: false, error: msg };
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (email, password, firstName, lastName) => {
    set({ isLoading: true, error: null });

    try {
      if (!isSupabaseConfigured()) {
        const users = JSON.parse(localStorage.getItem('swifttrade_users') || '[]');
        if (users.find((u: any) => u.email === email.toLowerCase())) {
          set({ error: 'Email already registered' });
          return { success: false, error: 'Email already registered' };
        }

        const newUser: User = {
          id: `demo_${Date.now()}`,
          email: email.toLowerCase(),
          firstName: firstName || '',
          lastName: lastName || '',
          role: 'user',
          tier: 'basic',
          tierLevel: 0,
          tierActive: false,
          balance: 0,
          bonusBalance: 0,
          totalDeposited: 0,
          kycStatus: 'none',
          registrationStatus: 'pending_kyc',
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        users.push({ ...newUser, password });
        localStorage.setItem('swifttrade_users', JSON.stringify(users));

        try {
          sessionStorage.setItem('swifttrade_session', JSON.stringify(newUser));
        } catch {}
        localStorage.setItem('swifttrade_session', JSON.stringify(newUser));

        set({ user: newUser, isAuthenticated: true });
        return { success: true };
      }

      const res = await withRetry(
        () => supabase.auth.signUp({
          email,
          password,
          options: { data: { first_name: firstName || '', last_name: lastName || '' } },
        }),
        20000
      );

      const authError = (res as any).error;
      const authData = (res as any).data;

      if (authError) {
        const msg = humanError(authError.message);
        set({ error: msg });
        return { success: false, error: msg };
      }

      if (!authData?.user) {
        set({ error: 'Could not create your account. Please try again.' });
        return { success: false, error: 'Could not create your account. Please try again.' };
      }

      return { success: true };
    } catch (err: any) {
      const msg = humanError(err?.message);
      set({ error: msg });
      return { success: false, error: msg };
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      if (!isSupabaseConfigured()) {
        try {
          sessionStorage.removeItem('swifttrade_session');
        } catch {}
        localStorage.removeItem('swifttrade_session');
      } else {
        await supabase.auth.signOut();
      }
    } finally {
      // ✅ Clear ALL trading persist stores to prevent data leaks between users
      const tradingKeys = [
        'swifttrade-trading-accounts',
        'swifttrade-spot-trading',
        'swifttrade-investments',
        'swifttrade-airdrops',
        'swifttrade-deposit-addresses',
      ];
      tradingKeys.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch {}
      });

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        deposits: [],
        trades: [],
        paymentMethods: [],
        error: null,

        // reset OTP too
        otpEmail: '',
        otpName: '',
        otpPassword: '',
        redirectUrl: '/dashboard',
      });
    }
  },

  checkSession: async () => {
    set({ isLoading: true });

    try {
      if (!isSupabaseConfigured()) {
        // ✅ support both, migrate to sessionStorage if only local exists
        let session =
          (typeof sessionStorage !== 'undefined'
            ? sessionStorage.getItem('swifttrade_session')
            : null) || localStorage.getItem('swifttrade_session');

        if (session) {
          try {
            sessionStorage.setItem('swifttrade_session', session);
          } catch {}
          set({ user: JSON.parse(session), isAuthenticated: true });
        } else {
          set({ user: null, isAuthenticated: false });
        }
        return;
      }

      const sessRes = await withRetry(() => supabase.auth.getSession(), 20000);
      const session = (sessRes as any).data?.session;

      if (!session?.user) {
        set({ user: null, isAuthenticated: false });
        return;
      }

      const profileRes = await withTimeout(
        supabase.from('users').select('*').eq('id', session.user.id).maybeSingle(),
        20000
      );

      const error = (profileRes as any).error;
      const profile = (profileRes as any).data;

      if (error) {
        set({ isAuthenticated: true });
        return;
      }

      if (profile) set({ user: dbRowToUser(profile), isAuthenticated: true });
      else set({ isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return false;

    try {
      if (!isSupabaseConfigured()) {
        const updatedUser = { ...user, ...updates };

        try {
          sessionStorage.setItem('swifttrade_session', JSON.stringify(updatedUser));
        } catch {}
        localStorage.setItem('swifttrade_session', JSON.stringify(updatedUser));

        // Also update users array so changes survive re-login
        try {
          const users = JSON.parse(localStorage.getItem('swifttrade_users') || '[]');
          const idx = users.findIndex((u: any) => u.id === user.id || u.email === user.email);
          if (idx >= 0) {
            users[idx] = { ...users[idx], ...updates };
            localStorage.setItem('swifttrade_users', JSON.stringify(users));
          }
        } catch {}

        set({ user: updatedUser });
        return true;
      }

      const dbUpdates: any = {};
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.walletAddress !== undefined) dbUpdates.wallet_address = updates.walletAddress;

      const res = await withTimeout(
        supabase.from('users').update(dbUpdates).eq('id', user.id).select().maybeSingle(),
        20000
      );

      const error = (res as any).error;
      if (error) {
        set({ error: humanError(error.message) });
        return false;
      }

      set({ user: { ...user, ...updates } });
      return true;
    } catch {
      return false;
    }
  },

  updateRegistrationStatus: async (status) => {
    const { user } = get();
    if (!user) return false;

    try {
      if (!isSupabaseConfigured()) {
        const updatedUser = { ...user, registrationStatus: status };

        try {
          sessionStorage.setItem('swifttrade_session', JSON.stringify(updatedUser));
        } catch {}
        localStorage.setItem('swifttrade_session', JSON.stringify(updatedUser));

        // Also update users array so status survives re-login
        try {
          const users = JSON.parse(localStorage.getItem('swifttrade_users') || '[]');
          const idx = users.findIndex((u: any) => u.id === user.id || u.email === user.email);
          if (idx >= 0) {
            users[idx] = { ...users[idx], registrationStatus: status };
            localStorage.setItem('swifttrade_users', JSON.stringify(users));
          }
        } catch {}

        set({ user: updatedUser });
        return true;
      }

      const res = await withTimeout(
        supabase
          .from('users')
          .update({ registration_status: status, updated_at: new Date().toISOString() })
          .eq('id', user.id)
          .select()
          .maybeSingle(),
        20000
      );

      const error = (res as any).error;
      const data = (res as any).data;

      if (error) {
        set({ error: humanError(error.message) });
        return false;
      }

      if (data) set({ user: dbRowToUser(data) });
      else set({ user: { ...user, registrationStatus: status } });

      return true;
    } catch (e: any) {
      set({ error: humanError(e?.message) });
      return false;
    }
  },

  updateKycStatus: async (status) => {
    const { user } = get();
    if (!user) return false;

    try {
      const isPassed = status === 'verified' || status === 'approved';
      const nextRegistrationStatus: RegistrationStatus =
        isPassed && user.registrationStatus === 'pending_kyc'
          ? 'pending_wallet'
          : user.registrationStatus;

      if (!isSupabaseConfigured()) {
        const updatedUser: User = {
          ...user,
          kycStatus: status,
          registrationStatus: nextRegistrationStatus,
        };

        try {
          sessionStorage.setItem('swifttrade_session', JSON.stringify(updatedUser));
        } catch {}
        localStorage.setItem('swifttrade_session', JSON.stringify(updatedUser));

        set({ user: updatedUser });
        return true;
      }

      const res = await withTimeout(
        supabase
          .from('users')
          .update({
            kyc_status: status,
            registration_status: nextRegistrationStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .maybeSingle(),
        20000
      );

      const error = (res as any).error;
      const data = (res as any).data;

      if (error) {
        set({ error: humanError(error.message) });
        return false;
      }

      if (data) set({ user: dbRowToUser(data) });
      else set({ user: { ...user, kycStatus: status, registrationStatus: nextRegistrationStatus } });

      return true;
    } catch (e: any) {
      set({ error: humanError(e?.message) });
      return false;
    }
  },

  refreshUser: async () => {
    const { user } = get();
    if (!user || !isSupabaseConfigured()) return;

    try {
      const res = await withTimeout(
        supabase.from('users').select('*').eq('id', user.id).maybeSingle(),
        20000
      );
      const data = (res as any).data;
      if (data) set({ user: dbRowToUser(data) });
    } catch {}
  },

  loadDeposits: async () => {
    const { user } = get();
    if (!user || !isSupabaseConfigured()) return;

    const res = await withTimeout(
      supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      20000
    );

    const data = (res as any).data;
    if (data) {
      const deposits: Deposit[] = data.map((d: any) => ({
        id: d.id,
        orderId: d.order_id,
        amount: Number(d.amount) || 0,
        method: d.method,
        methodName: d.method_name,
        transactionRef: d.transaction_ref || undefined,
        proofUrl: d.proof_url || undefined,
        status: d.status,
        note: d.note || undefined,
        createdAt: d.created_at,
      }));
      set({ deposits });
    }
  },

  loadTrades: async () => {
    const { user } = get();
    if (!user || !isSupabaseConfigured()) return;

    const res = await withTimeout(
      supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      20000
    );

    const data = (res as any).data;
    if (data) {
      const trades: Trade[] = data.map((t: any) => ({
        id: t.id,
        pair: t.pair,
        type: t.type,
        side: t.side,
        amount: Number(t.amount) || 0,
        entryPrice: Number(t.entry_price) || 0,
        currentPrice: Number(t.current_price ?? t.entry_price) || 0,
        exitPrice: t.exit_price ? Number(t.exit_price) : undefined,
        leverage: t.leverage || 1,
        marginUsed: Number(t.margin_used) || 0,
        status: t.status,
        pnl: Number(t.pnl) || 0,
        stopLoss: t.stop_loss ? Number(t.stop_loss) : undefined,
        takeProfit: t.take_profit ? Number(t.take_profit) : undefined,
        createdAt: t.created_at,
        closedAt: t.closed_at || undefined,
      }));
      set({ trades });
    }
  },

  loadPaymentMethods: async () => {
    if (!isSupabaseConfigured()) return;

    const res = await withTimeout(
      supabase.from('payment_methods').select('*').eq('enabled', true).order('display_order'),
      20000
    );

    const data = (res as any).data;
    if (data) {
      const methods: PaymentMethod[] = data.map((p: any) => ({
        id: p.id,
        type: p.type,
        name: p.name,
        symbol: p.symbol || undefined,
        network: p.network || undefined,
        address: p.address || undefined,
        icon: p.icon || undefined,
        minDeposit: Number(p.min_deposit) || 0,
        fee: p.fee || undefined,
        enabled: !!p.enabled,
      }));
      set({ paymentMethods: methods });
    }
  },

  submitDeposit: async (deposit) => {
    const { user } = get();
    if (!user || !isSupabaseConfigured()) return false;

    try {
      const res = await withTimeout(
        supabase.from('deposits').insert({
          user_id: user.id,
          order_id: `DEP-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          amount: deposit.amount,
          method: deposit.method,
          method_name: deposit.methodName,
          transaction_ref: deposit.transactionRef,
          proof_url: deposit.proofUrl,
          status: 'pending',
        }),
        20000
      );

      const error = (res as any).error;
      if (error) {
        set({ error: humanError(error.message) });
        return false;
      }

      await get().loadDeposits();
      return true;
    } catch {
      return false;
    }
  },

  getBalance: () => {
    const { user } = get();
    return { available: user?.balance || 0, bonus: user?.bonusBalance || 0 };
  },

  clearError: () => set({ error: null }),
}));

// ============================================
// ADMIN STORE
// ============================================
interface AdminStore {
  isAdmin: boolean;
  pendingDeposits: any[];
  allUsers: any[];

  checkAdminAccess: () => Promise<boolean>;
  loadPendingDeposits: () => Promise<void>;
  loadAllUsers: () => Promise<void>;
  confirmDeposit: (depositId: string, note?: string) => Promise<boolean>;
  rejectDeposit: (depositId: string, note?: string) => Promise<boolean>;
  updateUserBalance: (userId: string, amount: number, type: 'add' | 'subtract') => Promise<boolean>;
}

export const useAdminStore = create<AdminStore>((set, get) => ({
  isAdmin: false,
  pendingDeposits: [],
  allUsers: [],

  checkAdminAccess: async () => {
    if (!isSupabaseConfigured()) return false;

    const sessRes = await withTimeout(supabase.auth.getSession(), 20000);
    const session = (sessRes as any).data?.session;
    if (!session?.user) return false;

    const res = await withTimeout(
      supabase.from('users').select('role').eq('id', session.user.id).maybeSingle(),
      20000
    );

    const data = (res as any).data;
    const isAdmin = data?.role === 'admin';
    set({ isAdmin });
    return isAdmin;
  },

  loadPendingDeposits: async () => {
    if (!isSupabaseConfigured()) return;

    const res = await withTimeout(
      supabase
        .from('deposits')
        .select('*, users(email, first_name, last_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      20000
    );

    set({ pendingDeposits: (res as any).data || [] });
  },

  loadAllUsers: async () => {
    if (!isSupabaseConfigured()) return;

    const res = await withTimeout(
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      20000
    );

    set({ allUsers: (res as any).data || [] });
  },

  confirmDeposit: async (depositId, note) => {
    if (!isSupabaseConfigured()) return false;

    const sessRes = await withTimeout(supabase.auth.getSession(), 20000);
    const session = (sessRes as any).data?.session;
    if (!session?.user) return false;

    const depRes = await withTimeout(
      supabase.from('deposits').select('*').eq('id', depositId).maybeSingle(),
      20000
    );

    const deposit = (depRes as any).data;
    if (!deposit) return false;

    await withTimeout(
      supabase
        .from('deposits')
        .update({
          status: 'confirmed',
          processed_by: session.user.id,
          processed_at: new Date().toISOString(),
          note,
        })
        .eq('id', depositId),
      20000
    );

    const userRes = await withTimeout(
      supabase
        .from('users')
        .select('balance_available, total_deposited')
        .eq('id', deposit.user_id)
        .maybeSingle(),
      20000
    );

    const u = (userRes as any).data;
    if (u) {
      const currentBal = Number(u.balance_available ?? 0);
      const currentDep = Number(u.total_deposited ?? 0);
      const amt = Number(deposit.amount ?? 0);

      await withTimeout(
        supabase
          .from('users')
          .update({
            balance_available: currentBal + amt,
            total_deposited: currentDep + amt,
          })
          .eq('id', deposit.user_id),
        20000
      );
    }

    await get().loadPendingDeposits();
    return true;
  },

  rejectDeposit: async (depositId, note) => {
    if (!isSupabaseConfigured()) return false;

    const sessRes = await withTimeout(supabase.auth.getSession(), 20000);
    const session = (sessRes as any).data?.session;
    if (!session?.user) return false;

    await withTimeout(
      supabase
        .from('deposits')
        .update({
          status: 'rejected',
          processed_by: session.user.id,
          processed_at: new Date().toISOString(),
          note,
        })
        .eq('id', depositId),
      20000
    );

    await get().loadPendingDeposits();
    return true;
  },

  updateUserBalance: async (userId, amount, type) => {
    if (!isSupabaseConfigured()) return false;

    const res = await withTimeout(
      supabase.from('users').select('balance_available').eq('id', userId).maybeSingle(),
      20000
    );

    const u = (res as any).data;
    if (!u) return false;

    const current = Number(u.balance_available ?? 0);
    const next = type === 'add' ? current + amount : Math.max(0, current - amount);

    await withTimeout(
      supabase.from('users').update({ balance_available: next }).eq('id', userId),
      20000
    );

    await get().loadAllUsers();
    return true;
  },
}));

// ============================================
// AUTH STATE LISTENER (only once)
// ============================================
if (typeof window !== 'undefined' && isSupabaseConfigured()) {
  const g = globalThis as any;
  if (!g.__swifttrade_auth_listener__) {
    g.__swifttrade_auth_listener__ = true;

    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        useStore.setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          deposits: [],
          trades: [],
          paymentMethods: [],
          error: null,
          otpEmail: '',
          otpName: '',
          otpPassword: '',
          redirectUrl: '/dashboard',
        });
      }
    });
  }
}

// ✅ Back-compat exports (keep)
export { supabase, isSupabaseConfigured };

// ✅ FIXES FOR YOUR ERRORS:
export const useOtpStore = useStore;
export const useKYCStore = useStore;
