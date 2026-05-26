'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Shield,
  Gift,
  Copy,
  CheckCircle,
  Loader2,
  AlertCircle,
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useStore } from '@/lib/supabase/store-supabase';

interface TierInfo {
  level: number;
  code: string;
  name: string;
  price: number;
  bonus: number;
  features: string[];
}

type CheckoutStep = 'review' | 'payment' | 'submitted';

type CheckoutWallet = {
  id: string;
  symbol: string;
  name: string;
  network: string;
  address: string;
  enabled: boolean;
  icon?: string;
  label?: string | null;
  source?: 'user' | 'global' | 'default';
};

type ResolvedWalletResponse = {
  wallets?: CheckoutWallet[];
};

const TIER_MAP: Record<string, TierInfo> = {
  starter: {
    level: 1,
    code: 'starter',
    name: 'Starter',
    price: 500,
    bonus: 200,
    features: ['Live trading', 'Shield protection', '1:50 leverage'],
  },
  trader: {
    level: 2,
    code: 'trader',
    name: 'Trader',
    price: 1000,
    bonus: 400,
    features: ['DCA Bots', 'All Starter features', '1:100 leverage'],
  },
  professional: {
    level: 3,
    code: 'professional',
    name: 'Professional',
    price: 3000,
    bonus: 1200,
    features: ['GridWarrior Bots', 'AI Assistant', 'All Trader features'],
  },
  elite: {
    level: 4,
    code: 'elite',
    name: 'Elite',
    price: 5000,
    bonus: 2000,
    features: ['Unlimited leverage', 'Dedicated manager', 'All features'],
  },
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useStore();

  const tierCode = searchParams.get('tier') || '';
  const tier = TIER_MAP[tierCode.toLowerCase()];

  const [step, setStep] = useState<CheckoutStep>('review');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [txHash, setTxHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userTierLevel, setUserTierLevel] = useState(0);
  const [allWallets, setAllWallets] = useState<CheckoutWallet[]>([]);

  const selectedWalletObj = useMemo(() => {
    return allWallets.find((w) => w.id === selectedWallet) || null;
  }, [allWallets, selectedWallet]);

  useEffect(() => {
    if (!selectedWallet && allWallets.length > 0) {
      setSelectedWallet(allWallets[0].id);
    }
  }, [allWallets, selectedWallet]);

  useEffect(() => {
    if (!selectedWallet) return;

    const stillExists = allWallets.some((w) => w.id === selectedWallet);
    if (!stillExists) {
      setSelectedWallet(allWallets[0]?.id || '');
    }
  }, [allWallets, selectedWallet]);

  useEffect(() => {
    let isMounted = true;

    const loadPageState = async (showLoading = false) => {
      try {
        if (showLoading && isMounted) setLoading(true);

        if (!user?.id) {
          if (isMounted) {
            setAllWallets([]);
            setUserTierLevel(0);
            setLoading(false);
          }
          return;
        }

        const walletsRes = await fetch(
          `/api/wallets/resolved?purpose=tier_checkout&userId=${encodeURIComponent(user.id)}`,
          { cache: 'no-store' }
        );

        const walletsJson: ResolvedWalletResponse = walletsRes.ok
          ? await walletsRes.json()
          : { wallets: [] };

        const { supabase, isSupabaseConfigured } = await import('@/lib/supabase/client');

        let tierLevel = 0;
        if (isSupabaseConfigured()) {
          const { data: userRow } = await supabase
            .from('users')
            .select('tier_level')
            .eq('id', user.id)
            .maybeSingle();

          tierLevel = Number(userRow?.tier_level ?? 0);
        }

        if (!isMounted) return;

        setAllWallets(Array.isArray(walletsJson.wallets) ? walletsJson.wallets : []);
        setUserTierLevel(tierLevel);
      } catch {
        if (!isMounted) return;
        setAllWallets([]);
      } finally {
        if (isMounted && showLoading) setLoading(false);
      }
    };

    void loadPageState(true);

    const onFocus = () => {
      void loadPageState(false);
    };

    let intervalId: number | undefined;

    if (typeof window !== 'undefined') {
      intervalId = window.setInterval(() => {
        void loadPageState(false);
      }, 30000);

      window.addEventListener('focus', onFocus);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus);
        if (intervalId) window.clearInterval(intervalId);
      }
    };
  }, [user?.id]);

  if (!tier) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <AlertCircle className="w-12 h-12 text-loss mx-auto mb-4" />
        <h2 className="text-xl font-bold text-cream mb-2">Invalid Tier</h2>
        <p className="text-slate-400 mb-6">The tier &quot;{tierCode}&quot; was not found.</p>
        <button
          onClick={() => router.push('/dashboard/tier')}
          className="px-6 py-2 bg-gold text-void rounded-xl font-semibold"
        >
          Back to Tiers
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (userTierLevel >= tier.level) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 bg-profit/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-profit" />
        </div>
        <h2 className="text-xl font-bold text-cream mb-2">You Already Have This Plan</h2>
        <p className="text-slate-400 mb-6">You already own the {tier.name} tier or higher.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-6 py-2 bg-gold text-void rounded-xl font-semibold"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  async function handleCopyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function handleSubmit() {
    if (!user?.id) return;

    setIsSubmitting(true);
    setError('');

    try {
      const walletObj = allWallets.find((w) => w.id === selectedWallet) || null;

      const res = await fetch('/api/tier-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tierCode: tier.code,
          txHash: txHash || undefined,
          amountPaid: tier.price,
          currency: 'USD',
          paymentAsset: walletObj?.symbol || 'crypto',
          paymentNetwork: walletObj?.network || undefined,
          addressShown: walletObj?.address || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to submit purchase');
        return;
      }

      setStep('submitted');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        onClick={() => router.push('/dashboard/tier')}
        className="flex items-center gap-2 text-slate-400 hover:text-cream mb-8 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Tiers
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-cream">
          Purchase {tier.name} Tier
        </h1>
        <p className="text-sm text-slate-500 mt-1">Complete your upgrade in a few simple steps</p>
      </div>

      {step !== 'submitted' && (
        <div className="flex items-center gap-3 mb-8">
          {[
            { key: 'review', label: 'Select Method' },
            { key: 'payment', label: 'Payment' },
          ].map((s, i) => {
            const isActive = s.key === step;
            const isDone = s.key === 'review' && step === 'payment';

            return (
              <div key={s.key} className="flex items-center gap-3 flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                    isDone
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : isActive
                        ? 'bg-gold/20 text-gold border border-gold/40'
                        : 'bg-white/5 text-slate-500 border border-white/10'
                  }`}
                >
                  {isDone ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isActive
                      ? 'text-cream'
                      : isDone
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
                {i === 0 && <div className="flex-1 h-px bg-white/10" />}
              </div>
            );
          })}
        </div>
      )}

      {step === 'submitted' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-obsidian rounded-2xl border border-emerald-500/30 p-8 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-cream mb-2">Purchase Submitted!</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Your {tier.name} tier purchase is pending review. Once approved, you&apos;ll receive:
          </p>
          <div className="bg-gold/10 border border-gold/20 rounded-xl p-5 mb-6 inline-block">
            <p className="text-gold font-bold text-xl">
              +${tier.bonus.toLocaleString()} Trading Credit
            </p>
            <p className="text-sm text-slate-400 mt-1">
              40% bonus on ${tier.price.toLocaleString()} tier price
            </p>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            You&apos;ll be notified when your purchase is approved. This usually takes a few hours.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-3 bg-gradient-to-r from-gold to-gold/80 text-void font-semibold rounded-xl hover:shadow-lg hover:shadow-gold/20 transition-all"
          >
            Return to Dashboard
          </button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          <div className="bg-obsidian rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Order Summary
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">{tier.name} Tier</span>
                <span className="text-cream font-semibold text-lg">
                  ${tier.price.toLocaleString()}
                </span>
              </div>
              <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                <span className="text-gold flex items-center gap-1.5">
                  <Gift className="w-4 h-4" />
                  Trading Credit Bonus (40%)
                </span>
                <span className="text-gold font-bold">+${tier.bonus.toLocaleString()}</span>
              </div>
              <div className="mt-3 bg-white/[0.03] rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-2">Features unlocked:</p>
                <div className="flex flex-wrap gap-1.5">
                  {tier.features.map((f, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-lg text-xs text-slate-300"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {step === 'review' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-obsidian rounded-2xl border border-white/10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  Select Payment Method
                </h3>
              </div>
              <div className="p-6">
                {allWallets.length > 0 ? (
                  <div className="space-y-3">
                    {allWallets.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => {
                          setSelectedWallet(w.id);
                          setStep('payment');
                          setError('');
                        }}
                        className="w-full p-4 rounded-xl border border-white/10 hover:border-gold/30 hover:bg-gold/[0.03] transition-all flex items-center gap-4 group"
                      >
                        <div className="w-11 h-11 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                          <Wallet className="w-5 h-5 text-gold" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <p className="text-cream font-medium">{w.name}</p>
                          <p className="text-xs text-slate-500 truncate">{w.network}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-gold transition-colors" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <Wallet className="w-7 h-7 text-slate-500" />
                    </div>
                    <p className="text-slate-400 mb-1">No payment methods configured</p>
                    <p className="text-xs text-slate-500">Contact support for assistance.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-obsidian rounded-2xl border border-white/10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  Payment Instructions
                </h3>
              </div>
              <div className="p-6">
                {selectedWalletObj?.address ? (
                  <div className="space-y-5">
                    <div className="bg-gradient-to-br from-gold/10 to-sapphire-700/5 border border-gold/20 rounded-xl p-5 text-center">
                      <p className="text-xs text-slate-500 mb-1">Send exactly</p>
                      <p className="text-3xl font-display font-bold text-cream">
                        ${tier.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-gold mt-1">
                        via {selectedWalletObj.name} ({selectedWalletObj.network})
                      </p>
                    </div>

                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5">
                      <p className="text-xs text-slate-500 mb-4 text-center">Deposit address:</p>
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-3 bg-white rounded-xl">
                          <QRCodeSVG
                            value={selectedWalletObj.address}
                            size={140}
                            bgColor="#FFFFFF"
                            fgColor="#0a0a14"
                            level="H"
                            includeMargin={false}
                          />
                        </div>

                        <div className="flex items-center gap-2 w-full">
                          <code className="flex-1 text-sm text-gold break-all font-mono bg-void/60 border border-white/5 p-3 rounded-xl">
                            {selectedWalletObj.address}
                          </code>
                          <button
                            onClick={() => handleCopyAddress(selectedWalletObj.address)}
                            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex-shrink-0"
                            title="Copy address"
                          >
                            {copied ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-champagne-400/15 border border-champagne-400/25 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-champagne-300 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-champagne-300/90">
                        Send only {selectedWalletObj.symbol} on the {selectedWalletObj.network}{' '}
                        network. Sending incorrect tokens or to the wrong network may result in
                        permanent loss.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/[0.03] rounded-xl p-6 text-center">
                    <p className="text-slate-400">
                      Send <strong className="text-cream">${tier.price.toLocaleString()}</strong> to
                      complete payment.
                    </p>
                    <p className="text-xs text-slate-500 mt-2">Contact support for payment details.</p>
                  </div>
                )}

                <div className="mt-6 space-y-5">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Transaction Hash{' '}
                      <span className="text-slate-600">(optional but speeds up verification)</span>
                    </label>
                    <input
                      type="text"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-cream placeholder:text-slate-600 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 font-mono text-sm transition-colors"
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <p className="text-sm text-red-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setStep('review');
                        setError('');
                      }}
                      className="px-6 py-3 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 transition-colors border border-white/10"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !selectedWalletObj}
                      className="flex-1 py-3 bg-gradient-to-r from-gold to-gold/80 text-void font-semibold rounded-xl hover:shadow-lg hover:shadow-gold/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:shadow-none"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4" />
                          I&apos;ve Paid — Submit for Review
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TierCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}