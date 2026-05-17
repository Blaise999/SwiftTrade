'use client';

import { useState, useEffect, Suspense, type ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import {
  Wallet,
  Copy,
  CheckCircle,
  CreditCard,
  Bitcoin,
  Building2,
  Clock,
  Shield,
  ChevronRight,
  X,
  AlertCircle,
  TrendingUp,
  Globe,
  Coins,
  Gift,
  Upload,
  MessageCircle,
  Info,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  RefreshCw,
  Send,
  ArrowDownCircle,
} from 'lucide-react';
import { useStore } from '@/lib/supabase/store-supabase';
import { useWalletStore } from '@/lib/wallet-store';
import { useMembershipStore, TIER_CONFIG, type MembershipTier } from '@/lib/membership-tiers';
import {
  useDepositSettingsStore,
  type CryptoWallet,
  type BankAccount,
  type PaymentProcessor,
} from '@/lib/deposit-settings';
import KYCGate from '@/components/KYCGate';

const botInfo: Record<string, { name: string; min: number }> = {
  'grid-bot': { name: 'Grid Trading Bot', min: 100 },
  'dca-bot': { name: 'DCA Bot', min: 50 },
  'arbitrage-bot': { name: 'Arbitrage Bot', min: 500 },
  'momentum-bot': { name: 'Momentum Bot', min: 250 },
  'ai-bot': { name: 'AI Trading Bot', min: 1000 },
};

type DepositStep = 'method' | 'details' | 'confirm' | 'submitted';
type PaymentMethod = 'crypto' | 'bank' | 'processor';

type TierLabelConfig = { displayName?: string; name?: string; label?: string; title?: string };

type WithdrawalRow = {
  id: string;
  amount: number;
  asset: string;
  network: string;
  destinationAddress: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
  adminNote?: string | null;
  rejectionReason?: string | null;
  txHash?: string | null;
};

type ResolvedWalletApiItem = {
  id: string;
  symbol: string;
  network: string;
  name: string;
  icon?: string;
  address: string;
  enabled: boolean;
  label?: string | null;
  walletType: 'deposit' | 'tier_checkout';
  source: 'user' | 'global' | 'default';
  minAmount: number;
  confirmations: number;
};

const WITHDRAW_ASSETS = [
  {
    id: 'eth',
    symbol: 'ETH',
    name: 'Ethereum',
    network: 'ERC20',
  },
  {
    id: 'btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    network: 'BTC',
  },
] as const;

const TIER_LABELS: Record<number, string> = {
  0: 'Basic',
  1: 'Starter',
  2: 'Trader',
  3: 'Professional',
  4: 'Elite',
};

function normalizeKeyPart(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function walletKey(currency?: string | null, network?: string | null) {
  return `${normalizeKeyPart(currency)}::${normalizeKeyPart(network)}`;
}

function sameWallet(
  a?: Pick<CryptoWallet, 'id' | 'symbol' | 'network'> | null,
  b?: Pick<CryptoWallet, 'id' | 'symbol' | 'network'> | null
) {
  if (!a || !b) return false;
  if (String(a.id) === String(b.id)) return true;
  return walletKey(a.symbol, a.network) === walletKey(b.symbol, b.network);
}

function getWalletIcon(symbol?: string | null, network?: string | null) {
  const s = String(symbol || '').trim().toUpperCase();
  const n = String(network || '').trim().toUpperCase();

  if (s === 'BTC' || n === 'BTC') return '₿';
  if (s === 'ETH') return 'Ξ';
  if (s === 'USDT') return '💵';
  if (s === 'USDC') return '💲';
  if (s === 'SOL' || n.includes('SOL')) return '◎';

  return '💰';
}

function WalletContent() {
  const { user } = useStore();
  const { address: walletAddress, isConnected } = useWalletStore();
  const { currentTier: storeTier } = useMembershipStore();
  const searchParams = useSearchParams();

  const source = searchParams.get('source');
  const incomingPlanName = searchParams.get('planName');
  const incomingAmount = searchParams.get('amount');
  const incomingAccountId = searchParams.get('accountId');

  const {
    depositInstructions,
    requireProof,
    globalMinDeposit,
    getEnabledBankAccounts,
    getEnabledPaymentProcessors,
    submitDeposit,
    getUserDeposits,
  } = useDepositSettingsStore();

  const stakeToken = searchParams.get('stake');
  const botId = searchParams.get('bot');
  const tierId = searchParams.get('tier') as MembershipTier | null;
  const tierAmount = searchParams.get('amount');

  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [depositStep, setDepositStep] = useState<DepositStep>('method');
  const [selectedMethodType, setSelectedMethodType] = useState<PaymentMethod | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoWallet | null>(null);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [selectedProcessor, setSelectedProcessor] = useState<PaymentProcessor | null>(null);
  const [enabledCrypto, setEnabledCrypto] = useState<CryptoWallet[]>([]);
  const [amount, setAmount] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [userTierActive, setUserTierActive] = useState<boolean | null>(null);
  const [dbTierLevel, setDbTierLevel] = useState<number | null>(null);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAssetId, setWithdrawAssetId] = useState<string>(WITHDRAW_ASSETS[0].id);
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawMemo, setWithdrawMemo] = useState('');
  const [withdrawIsSubmitting, setWithdrawIsSubmitting] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [dbWithdrawals, setDbWithdrawals] = useState<WithdrawalRow[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);

  const [dbDeposits, setDbDeposits] = useState<any[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(false);

  const [isFromInvestment, setIsFromInvestment] = useState(false);

  const userAny = user as any;
  const availableBalance = Number(userAny?.balance_available ?? user?.balance ?? 0);

  const fallbackTierLabel =
    typeof storeTier === 'string' && storeTier.length > 0
      ? storeTier.charAt(0).toUpperCase() + storeTier.slice(1)
      : 'Basic';

  const actualTierLabel =
    dbTierLevel !== null ? TIER_LABELS[dbTierLevel] ?? fallbackTierLabel : fallbackTierLabel;

  useEffect(() => {
    if (source === 'investment') {
      setActiveTab('withdraw');
      if (incomingAmount) setWithdrawAmount(incomingAmount);
      setIsFromInvestment(true);
    }
  }, [source, incomingAmount]);

  useEffect(() => {
    if (!user?.id) {
      setUserTierActive(null);
      setDbTierLevel(null);
      return;
    }

    const checkTier = async () => {
      try {
        const { supabase, isSupabaseConfigured } = await import('@/lib/supabase/client');
        if (!isSupabaseConfigured()) {
          setUserTierActive(true);
          setDbTierLevel(null);
          return;
        }

        const { data } = await supabase
          .from('users')
          .select('tier_level, tier_active')
          .eq('id', user.id)
          .maybeSingle();

        const tierLevel = Number(data?.tier_level ?? 0);
        setDbTierLevel(tierLevel);
        setUserTierActive(Boolean(data?.tier_active) && tierLevel >= 1);
      } catch {
        setUserTierActive(true);
        setDbTierLevel(null);
      }
    };

    void checkTier();
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const loadResolvedDepositWallets = async () => {
      try {
        const query = user?.id
          ? `/api/wallets/resolved?purpose=deposit&userId=${encodeURIComponent(user.id)}`
          : '/api/wallets/resolved?purpose=deposit';

        const res = await fetch(query, { cache: 'no-store' });
        const json = res.ok ? await res.json() : { wallets: [] };

        const mapped: CryptoWallet[] = Array.isArray(json.wallets)
          ? (json.wallets as ResolvedWalletApiItem[]).map((wallet) => ({
              id: wallet.id,
              symbol: wallet.symbol,
              name: wallet.name,
              network: wallet.network,
              address: wallet.address,
              enabled: wallet.enabled !== false,
              // ←←← FIXED: Minimum deposit is now forced to $100 everywhere
              minDeposit: 100,
              confirmations: Number(wallet.confirmations ?? 0),
              icon: wallet.icon?.trim() || getWalletIcon(wallet.symbol, wallet.network),
            }))
          : [];

        if (!cancelled) {
          setEnabledCrypto(mapped);
        }
      } catch {
        if (!cancelled) {
          setEnabledCrypto([]);
        }
      }
    };

    void loadResolvedDepositWallets();

    const onFocus = () => {
      void loadResolvedDepositWallets();
    };

    let intervalId: number | undefined;

    if (typeof window !== 'undefined') {
      intervalId = window.setInterval(() => {
        void loadResolvedDepositWallets();
      }, 30000);

      window.addEventListener('focus', onFocus);
    }

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        if (intervalId) window.clearInterval(intervalId);
        window.removeEventListener('focus', onFocus);
      }
    };
  }, [user?.id]);

  const selectedCryptoResolved =
    !selectedCrypto
      ? null
      : enabledCrypto.find((wallet) => sameWallet(wallet, selectedCrypto)) ?? selectedCrypto;

  useEffect(() => {
    if (!selectedCrypto || !selectedCryptoResolved) return;

    const changed =
      selectedCrypto.id !== selectedCryptoResolved.id ||
      selectedCrypto.address !== selectedCryptoResolved.address ||
      selectedCrypto.name !== selectedCryptoResolved.name ||
      selectedCrypto.network !== selectedCryptoResolved.network;

    if (changed) {
      setSelectedCrypto(selectedCryptoResolved);
    }
  }, [selectedCrypto, selectedCryptoResolved]);

  const enabledBanks = getEnabledBankAccounts();
  const enabledProcessors = getEnabledPaymentProcessors();

  const withdrawAssets = WITHDRAW_ASSETS;

  const selectedWithdrawAsset =
    withdrawAssets.find((a) => String(a.id) === String(withdrawAssetId)) || null;

  useEffect(() => {
    const exists = withdrawAssets.some((asset) => String(asset.id) === String(withdrawAssetId));
    if (!exists) {
      setWithdrawAssetId(withdrawAssets[0].id);
    }
  }, [withdrawAssetId, withdrawAssets]);

  const loadDepositsFromDB = async () => {
    if (!user?.id) return;
    if (isSubmitting) return;
    setDepositsLoading(true);
    try {
      const res = await fetch(`/api/deposits?userId=${user.id}`, {
        headers: { 'x-user-id': user.id },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        setDbDeposits(json.deposits || []);
      }
    } catch {}
    setDepositsLoading(false);
  };

  const loadWithdrawalsFromDB = async () => {
    if (!user?.id) return;
    if (isSubmitting) return;
    setWithdrawalsLoading(true);
    try {
      const res = await fetch(`/api/withdrawals?userId=${user.id}`, {
        headers: { 'x-user-id': user.id },
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json();
        setDbWithdrawals(
          (json.withdrawals || []).map((w: any) => ({
            id: w.id,
            amount: Number(w.amount ?? 0),
            asset: w.asset || w.currency || 'ETH',
            network: w.network || '',
            destinationAddress: w.destination_address || w.wallet_address || '',
            status: w.status || 'pending',
            createdAt: w.created_at,
            adminNote: w.admin_note || null,
            rejectionReason: w.rejection_reason || null,
            txHash: w.tx_hash || null,
          }))
        );
      }
    } catch {}
    setWithdrawalsLoading(false);
  };

  useEffect(() => {
    if (user?.id) {
      void loadDepositsFromDB();
      void loadWithdrawalsFromDB();
    }
  }, [user?.id]);

  const localDeposits = user ? getUserDeposits(user.id) : [];
  const userDeposits =
    dbDeposits.length > 0
      ? dbDeposits.map((d: any) => ({
          id: d.id,
          amount: Number(d.amount ?? 0),
          methodName: d.method_name || d.method || d.network || 'Crypto',
          status: d.status || 'pending',
          createdAt: d.created_at,
          rejectionReason: d.rejection_reason || null,
          adminNote: d.admin_note || null,
          txHash: d.tx_hash || d.transaction_ref || null,
        }))
      : localDeposits;

  const selectedBot = botId ? botInfo[botId] : null;
  const selectedTier = tierId ? TIER_CONFIG[tierId] : null;

  const hasContext = Boolean(stakeToken || selectedBot || selectedTier);

  const selectedTierLabel = (() => {
    if (!tierId || !selectedTier) return null;
    const cfg = selectedTier as unknown as TierLabelConfig;
    return (
      cfg.displayName ??
      cfg.name ??
      cfg.label ??
      cfg.title ??
      tierId.charAt(0).toUpperCase() + tierId.slice(1)
    );
  })();

  useEffect(() => {
    if (selectedTier && tierAmount) {
      setAmount(tierAmount);
    } else if (selectedBot) {
      setAmount(selectedBot.min.toString());
    }
  }, [selectedBot, selectedTier, tierAmount]);

  useEffect(() => {
    if (!withdrawAddress && isConnected && walletAddress) {
      setWithdrawAddress(walletAddress);
    }
  }, [walletAddress, isConnected, withdrawAddress]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProofImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!user?.id) return;
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      let methodId = '';
      let methodName = '';
      if (selectedMethodType === 'crypto' && selectedCryptoResolved) {
        methodId = selectedCryptoResolved.id;
        methodName = `${selectedCryptoResolved.name} (${selectedCryptoResolved.network})`;
      } else if (selectedMethodType === 'bank' && selectedBank) {
        methodId = selectedBank.id;
        methodName = selectedBank.bankName;
      } else if (selectedMethodType === 'processor' && selectedProcessor) {
        methodId = selectedProcessor.id;
        methodName = selectedProcessor.name;
      }
      try {
        submitDeposit({
          amount: parseFloat(amount),
          method: selectedMethodType!,
          methodId,
          methodName,
          transactionRef,
          proofImage: proofImage || undefined,
          userId: user.id,
          userEmail: user.email,
        });
      } catch {}
      try {
        await fetch('/api/deposits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            amount: parseFloat(amount),
            currency: 'USD',
            method: selectedMethodType || 'crypto',
            methodName: methodName || 'Crypto',
            network: selectedMethodType === 'crypto' ? selectedCryptoResolved?.network || '' : undefined,
            txHash: transactionRef || undefined,
            paymentAsset: selectedMethodType === 'crypto' ? selectedCryptoResolved?.symbol || 'crypto' : undefined,
            addressShown: selectedMethodType === 'crypto' ? selectedCryptoResolved?.address || '' : undefined,
          }),
        });
      } catch {}
      await new Promise((r) => setTimeout(r, 800));
      setDepositStep('submitted');
      try { await loadDepositsFromDB(); } catch {}
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetDeposit = () => {
    setDepositStep('method');
    setSelectedMethodType(null);
    setSelectedCrypto(null);
    setSelectedBank(null);
    setSelectedProcessor(null);
    setAmount('');
    setTransactionRef('');
    setProofImage(null);
  };

  const handleSubmitWithdrawal = async () => {
    if (!user?.id) return;
    if (withdrawIsSubmitting) return;
    const numericAmount = parseFloat(withdrawAmount || '0');
    if (!selectedWithdrawAsset) { setWithdrawError('Select a withdrawal asset.'); return; }
    if (!withdrawAddress.trim()) { setWithdrawError('Enter a destination wallet address.'); return; }
    if (!numericAmount || numericAmount < 500) { setWithdrawError('Minimum withdrawal is $500.'); return; }
    if (numericAmount > availableBalance) { setWithdrawError('Withdrawal amount exceeds your available balance.'); return; }
    setWithdrawError('');
    setWithdrawIsSubmitting(true);
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({
          userId: user.id,
          amount: numericAmount,
          asset: selectedWithdrawAsset.symbol,
          network: selectedWithdrawAsset.network,
          destinationAddress: withdrawAddress.trim(),
          destinationTag: withdrawMemo.trim() || null,
          note: withdrawMemo.trim() || null,
          source: source,
          investmentAccountId: incomingAccountId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setWithdrawError(data.error || 'Failed to submit withdrawal request.');
        return;
      }
      setWithdrawSuccess(true);
      setWithdrawAmount('');
      setWithdrawMemo('');
      try { await loadWithdrawalsFromDB(); } catch {}
    } catch {
      setWithdrawError('Network error while submitting withdrawal request.');
    } finally {
      setWithdrawIsSubmitting(false);
    }
  };

  const quickAmounts = [100, 250, 500, 1000, 2500, 5000];

  // ←←← FIXED: All minimum deposits are now forced to $100
  const getMinDeposit = () => 100;


  const openSupportChat = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-support-widget'));
    }
  };

  return (
    <KYCGate action="deposit or withdraw funds">
      <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-cream">Wallet</h1>
          <p className="text-slate-400 mt-1">Manage your funds and transactions</p>
        </div>

        {userTierActive === false && (
          <div className="mb-6 p-4 bg-gold/5 border border-gold/20 rounded-2xl flex items-start gap-4">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gold">Activate a Tier to Start Trading</h3>
              <p className="text-xs text-slate-400 mt-1">
                You need an active tier plan to trade and access platform features. Deposit funds
                and purchase a tier to get started.
              </p>
            </div>
            <Link
              href="/dashboard/tier"
              className="px-4 py-2 bg-gold/10 text-gold text-sm font-medium rounded-lg hover:bg-gold/20 transition-colors whitespace-nowrap"
            >
              View Tiers
            </Link>
          </div>
        )}

        <AnimatePresence>
          {hasContext && !dismissedBanner && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 p-4 bg-gradient-to-r from-gold/20 to-profit/20 rounded-2xl border border-gold/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gold/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    {stakeToken && <Coins className="w-6 h-6 text-gold" />}
                    {selectedBot && <Globe className="w-6 h-6 text-gold" />}
                    {selectedTier && <Gift className="w-6 h-6 text-gold" />}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-cream">
                      {stakeToken && `You want to stake: ${stakeToken}`}
                      {selectedBot && `You selected: ${selectedBot.name}`}
                      {selectedTier && `Upgrade to: ${selectedTierLabel ?? 'Tier'} Tier`}
                    </h3>

                    <p className="text-sm text-cream/70 mt-1">
                      {stakeToken && `Deposit funds to start staking ${stakeToken}`}
                      {selectedBot && `Minimum allocation: $${selectedBot.min}`}
                      {selectedTier &&
                        `Deposit $${tierAmount ?? ''} to unlock ${selectedTierLabel ?? 'tier'} benefits`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDismissedBanner(true)}
                  className="p-1 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-5 h-5 text-cream/50" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-gold/20 to-gold/5 rounded-2xl border border-gold/20 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gold/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-gold" />
              </div>
              <span className="text-sm text-cream/60">Available Balance</span>
            </div>
            <p className="text-2xl font-bold text-cream">${availableBalance.toLocaleString()}</p>
            {availableBalance === 0 && (
              <p className="text-xs text-gold mt-2">Deposit to start trading</p>
            )}
          </div>

          <div className="bg-white/5 rounded-2xl border border-white/5 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-electric/10 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-electric" />
              </div>
              <span className="text-sm text-cream/60">Account Tier</span>
            </div>
            <p className="text-2xl font-bold text-cream">{actualTierLabel}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto">
          {(['deposit', 'withdraw', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                if (tab === 'deposit') resetDeposit();
                if (tab === 'withdraw') {
                  setWithdrawError('');
                  setWithdrawSuccess(false);
                  void loadWithdrawalsFromDB();
                }
                if (tab === 'history') {
                  void loadDepositsFromDB();
                  void loadWithdrawalsFromDB();
                }
              }}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all capitalize whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-gold text-void'
                  : 'bg-white/5 text-cream/60 hover:text-cream hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activeTab === 'deposit' && (
              <div className="bg-white/5 rounded-2xl border border-white/5 p-5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    {(['method', 'details', 'confirm'] as const).map((step, idx) => (
                      <div key={step} className="flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            depositStep === step || (depositStep === 'submitted' && idx < 3)
                              ? 'bg-gold text-void'
                              : ['method', 'details', 'confirm'].indexOf(depositStep as any) > idx
                                ? 'bg-profit text-void'
                                : 'bg-white/10 text-cream/50'
                          }`}
                        >
                          {['method', 'details', 'confirm'].indexOf(depositStep as any) > idx ||
                          depositStep === 'submitted' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        {idx < 2 && (
                          <div
                            className={`w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 ${
                              ['method', 'details', 'confirm'].indexOf(depositStep as any) > idx
                                ? 'bg-profit'
                                : 'bg-white/10'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {depositStep !== 'method' && depositStep !== 'submitted' && (
                    <button
                      onClick={() => {
                        if (depositStep === 'details') setDepositStep('method');
                        if (depositStep === 'confirm') setDepositStep('details');
                      }}
                      className="text-sm text-gold hover:text-gold/80"
                    >
                      ← Back
                    </button>
                  )}
                </div>

                {depositStep === 'method' && (
                  <div>
                    <h2 className="text-lg font-semibold text-cream mb-4">
                      Select Payment Method
                    </h2>

                    {enabledCrypto.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm text-cream/60 mb-3 flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-gold" />{' '}
                          <span className="text-gold font-semibold">Direct Deposit</span>
                        </h3>
                        <p className="text-xs text-cream/50 mb-3">
                          Send crypto directly from your wallet. The wallet options stay fixed, and
                          the address behind each option can now be overridden globally or per user.
                        </p>
                        <div className="grid sm:grid-cols-1 gap-3">
                          {enabledCrypto
                            .filter(
                              (c) =>
                                c.name.toUpperCase().includes('USDT') ||
                                c.symbol?.toUpperCase?.() === 'USDT' ||
                                c.name.toUpperCase().includes('TETHER')
                            )
                            .slice(0, 1)
                            .map((crypto) => (
                              <button
                                key={`direct-${crypto.id}`}
                                onClick={() => {
                                  setSelectedMethodType('crypto');
                                  setSelectedCrypto(crypto);
                                  setDepositStep('details');
                                }}
                                className="flex items-center gap-4 p-5 bg-gradient-to-r from-gold/10 to-profit/10 hover:from-gold/20 hover:to-profit/20 rounded-xl border border-gold/30 hover:border-gold/50 transition-all text-left"
                              >
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-xl flex items-center justify-center text-xl">
                                  💰
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-cream">Direct USDT Deposit</p>
                                  <p className="text-xs text-cream/60 mt-0.5">
                                    Send from your wallet → Our wallet • {crypto.network}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 px-3 py-1.5 bg-gold/20 text-gold text-xs font-semibold rounded-lg">
                                  <Zap className="w-3 h-3" /> Fastest
                                </div>
                              </button>
                            ))}

                          {enabledCrypto.filter(
                            (c) =>
                              c.name.toUpperCase().includes('USDT') ||
                              c.symbol?.toUpperCase?.() === 'USDT' ||
                              c.name.toUpperCase().includes('TETHER')
                          ).length === 0 &&
                            enabledCrypto.slice(0, 1).map((crypto) => (
                              <button
                                key={`direct-${crypto.id}`}
                                onClick={() => {
                                  setSelectedMethodType('crypto');
                                  setSelectedCrypto(crypto);
                                  setDepositStep('details');
                                }}
                                className="flex items-center gap-4 p-5 bg-gradient-to-r from-gold/10 to-profit/10 hover:from-gold/20 hover:to-profit/20 rounded-xl border border-gold/30 hover:border-gold/50 transition-all text-left"
                              >
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-xl flex items-center justify-center text-xl">
                                  💰
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-cream">Direct Crypto Deposit</p>
                                  <p className="text-xs text-cream/60 mt-0.5">
                                    Send from your wallet → Our wallet • {crypto.network}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 px-3 py-1.5 bg-gold/20 text-gold text-xs font-semibold rounded-lg">
                                  <Zap className="w-3 h-3" /> Fastest
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {enabledCrypto.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm text-cream/60 mb-3 flex items-center gap-2">
                          <Bitcoin className="w-4 h-4" /> Cryptocurrency
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {enabledCrypto.map((crypto) => (
                            <button
                              key={crypto.id}
                              onClick={() => {
                                setSelectedMethodType('crypto');
                                setSelectedCrypto(crypto);
                                setDepositStep('details');
                              }}
                              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-gold/30 transition-all text-left"
                            >
                              <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-lg flex items-center justify-center text-lg">
                                {crypto.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-cream truncate">{crypto.name}</p>
                                <p className="text-xs text-cream/50">{crypto.network}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-cream/30 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {enabledBanks.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm text-cream/60 mb-3 flex items-center gap-2">
                          <Building2 className="w-4 h-4" /> Bank Transfer
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {enabledBanks.map((bank) => (
                            <button
                              key={bank.id}
                              onClick={() => {
                                setSelectedMethodType('bank');
                                setSelectedBank(bank);
                                setDepositStep('details');
                              }}
                              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-gold/30 transition-all text-left"
                            >
                              <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-green-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-cream truncate">{bank.bankName}</p>
                                <p className="text-xs text-cream/50">
                                  {bank.currency} • {bank.country}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-cream/30 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {enabledProcessors.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-sm text-cream/60 mb-3 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" /> Other Methods
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {enabledProcessors.map((processor) => (
                            <button
                              key={processor.id}
                              onClick={() => {
                                setSelectedMethodType('processor');
                                setSelectedProcessor(processor);
                                setDepositStep('details');
                              }}
                              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-gold/30 transition-all text-left"
                            >
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg flex items-center justify-center text-lg">
                                {processor.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-cream truncate">{processor.name}</p>
                                <p className="text-xs text-cream/50">Fee: {processor.fee}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-cream/30 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {enabledCrypto.length === 0 &&
                      enabledBanks.length === 0 &&
                      enabledProcessors.length === 0 && (
                        <div className="text-center py-12">
                          <Wallet className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold text-cream mb-2">
                            No Deposit Wallets Assigned
                          </h3>
                          <p className="text-cream/60 mb-4">
                            Contact support to get your deposit addresses set up.
                          </p>
                          <button
                            onClick={openSupportChat}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-void font-medium rounded-xl hover:bg-gold/90 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" /> Chat with Support
                          </button>
                        </div>
                      )}
                  </div>
                )}

                {depositStep === 'details' && (
                  <div>
                    <h2 className="text-lg font-semibold text-cream mb-4">Payment Details</h2>

                    {selectedMethodType === 'crypto' && selectedCryptoResolved && (
                      <div className="p-4 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-xl border border-orange-500/20 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl">
                            {selectedCryptoResolved.icon}
                          </div>
                          <div>
                            <p className="font-semibold text-cream">{selectedCryptoResolved.name}</p>
                            <p className="text-sm text-cream/60">
                              {selectedCryptoResolved.network} Network
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-center mb-4">
                          <div className="w-44 h-44 sm:w-52 sm:h-52 bg-white rounded-xl p-3 flex items-center justify-center">
                            <QRCode
                              value={selectedCryptoResolved.address}
                              size={176}
                              bgColor="#ffffff"
                              fgColor="#111111"
                              level="M"
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="text-xs text-cream/50 mb-1 block">Deposit Address</label>
                          <div className="flex items-center gap-2 p-3 bg-void/50 rounded-lg">
                            <code className="flex-1 text-xs sm:text-sm text-gold font-mono break-all">
                              {selectedCryptoResolved.address}
                            </code>
                            <button
                              onClick={() => handleCopy(selectedCryptoResolved.address)}
                              className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                            >
                              {copied ? (
                                <CheckCircle className="w-4 h-4 text-profit" />
                              ) : (
                                <Copy className="w-4 h-4 text-cream/60" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg text-sm">
                          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                          <span className="text-yellow-500 text-xs sm:text-sm">
                            Only send {selectedCryptoResolved.symbol} on{' '}
                            {selectedCryptoResolved.network}. Min: ${getMinDeposit()}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedMethodType === 'bank' && selectedBank && (
                      <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-green-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-cream">{selectedBank.bankName}</p>
                            <p className="text-sm text-cream/60">{selectedBank.country}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between p-3 bg-void/30 rounded-lg">
                            <span className="text-cream/60 text-sm">Account Name</span>
                            <span className="text-cream font-medium text-sm">
                              {selectedBank.accountName}
                            </span>
                          </div>

                          <div className="flex justify-between p-3 bg-void/30 rounded-lg">
                            <span className="text-cream/60 text-sm">Account Number</span>
                            <div className="flex items-center gap-2">
                              <span className="text-cream font-mono text-sm">
                                {selectedBank.accountNumber}
                              </span>
                              <button onClick={() => handleCopy(selectedBank.accountNumber)}>
                                <Copy className="w-4 h-4 text-cream/40 hover:text-cream" />
                              </button>
                            </div>
                          </div>

                          {selectedBank.routingNumber && (
                            <div className="flex justify-between p-3 bg-void/30 rounded-lg">
                              <span className="text-cream/60 text-sm">Routing Number</span>
                              <span className="text-cream font-mono text-sm">
                                {selectedBank.routingNumber}
                              </span>
                            </div>
                          )}

                          {selectedBank.swiftCode && (
                            <div className="flex justify-between p-3 bg-void/30 rounded-lg">
                              <span className="text-cream/60 text-sm">SWIFT Code</span>
                              <span className="text-cream font-mono text-sm">
                                {selectedBank.swiftCode}
                              </span>
                            </div>
                          )}

                          {selectedBank.iban && (
                            <div className="flex justify-between p-3 bg-void/30 rounded-lg">
                              <span className="text-cream/60 text-sm">IBAN</span>
                              <span className="text-cream font-mono text-sm">{selectedBank.iban}</span>
                            </div>
                          )}

                          <div className="flex justify-between p-3 bg-void/30 rounded-lg">
                            <span className="text-cream/60 text-sm">Currency</span>
                            <span className="text-cream text-sm">{selectedBank.currency}</span>
                          </div>
                        </div>

                        {selectedBank.instructions && (
                          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg text-sm">
                            <p className="text-blue-400">{selectedBank.instructions}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedMethodType === 'processor' && selectedProcessor && (
                      <div className="p-4 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl border border-blue-500/20 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl">
                            {selectedProcessor.icon}
                          </div>
                          <div>
                            <p className="font-semibold text-cream">{selectedProcessor.name}</p>
                            <p className="text-sm text-cream/60">Fee: {selectedProcessor.fee}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between p-3 bg-void/30 rounded-lg">
                            <span className="text-cream/60 text-sm">Account</span>
                            <div className="flex items-center gap-2">
                              <span className="text-cream font-medium text-sm">
                                {selectedProcessor.accountId}
                              </span>
                              <button onClick={() => handleCopy(selectedProcessor.accountId)}>
                                <Copy className="w-4 h-4 text-cream/40 hover:text-cream" />
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-between p-3 bg-void/30 rounded-lg">
                            <span className="text-cream/60 text-sm">Name</span>
                            <span className="text-cream text-sm">{selectedProcessor.accountName}</span>
                          </div>
                        </div>

                        {selectedProcessor.instructions && (
                          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg text-sm">
                            <p className="text-blue-400">{selectedProcessor.instructions}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mb-6">
                      <label className="text-sm text-cream/60 mb-2 block">Amount (USD)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cream/50">
                          $
                        </span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder={`Min: ${getMinDeposit()}`}
                          className="w-full pl-8 pr-4 py-3 bg-void/50 border border-white/10 rounded-xl text-cream text-lg font-medium focus:border-gold focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        {quickAmounts.map((amt) => (
                          <button
                            key={amt}
                            onClick={() => setAmount(amt.toString())}
                            className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              amount === amt.toString()
                                ? 'bg-gold text-void'
                                : 'bg-white/5 text-cream/60 hover:bg-white/10 hover:text-cream'
                            }`}
                          >
                            ${amt}
                          </button>
                        ))}
                      </div>
                    </div>


                                        <button
                      type="button"
                      
                      onClick={() => setDepositStep('confirm')}
                      disabled={!amount || parseFloat(amount) < getMinDeposit()}
                      className="w-full py-3 bg-gold text-void font-semibold rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {depositStep === 'confirm' && (
                  <div>
                    <h2 className="text-lg font-semibold text-cream mb-4">Confirm Deposit</h2>

                    <div className="p-4 bg-void/50 rounded-xl border border-white/10 mb-6">
                      <div className="flex justify-between py-2 border-b border-white/5">
                        <span className="text-cream/60">Amount</span>
                        <span className="text-cream font-semibold">
                          ${parseFloat(amount || '0').toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-white/5">
                        <span className="text-cream/60">Method</span>
                        <span className="text-cream">
                          {selectedMethodType === 'crypto' && selectedCryptoResolved?.name}
                          {selectedMethodType === 'bank' && selectedBank?.bankName}
                          {selectedMethodType === 'processor' && selectedProcessor?.name}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-cream/60">Processing</span>
                        <span className="text-cream">1-24 hours</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="text-sm text-cream/60 mb-2 block">
                        Transaction ID / Reference {selectedMethodType !== 'crypto' && '(optional)'}
                      </label>
                      <input
                        type="text"
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        placeholder={
                          selectedMethodType === 'crypto'
                            ? 'Enter transaction hash'
                            : 'Enter reference number'
                        }
                        className="w-full px-4 py-3 bg-void/50 border border-white/10 rounded-xl text-cream focus:border-gold focus:outline-none"
                      />
                    </div>

                    {requireProof && (
                      <div className="mb-6">
                        <label className="text-sm text-cream/60 mb-2 block">
                          Payment Proof (Screenshot)
                        </label>
                        {!proofImage ? (
                          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-gold/50 transition-colors">
                            <Upload className="w-8 h-8 text-cream/40 mb-2" />
                            <span className="text-sm text-cream/60">Click to upload screenshot</span>
                            <span className="text-xs text-cream/40 mt-1">PNG, JPG up to 5MB</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="relative">
                            <img
                              src={proofImage}
                              alt="Payment proof"
                              className="w-full h-40 object-cover rounded-xl"
                            />
                            <button
                              onClick={() => setProofImage(null)}
                              className="absolute top-2 right-2 p-1 bg-void/80 rounded-lg hover:bg-void"
                            >
                              <X className="w-4 h-4 text-cream" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 mb-6">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-300">
                          <p className="mb-2">{depositInstructions}</p>
                          <p className="text-blue-400/70">
                            Need help? Open the in-app support chat from the help box on this page.
                          </p>
                        </div>
                      </div>
                    </div>

                                      <button
                      type="button"
                      onClick={handleSubmitDeposit}
                      disabled={isSubmitting || (requireProof && !proofImage)}
                      className="w-full py-3 bg-gold text-void font-semibold rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" /> Submit Deposit Request
                        </>
                      )}
                    </button>

                  </div>
                )}

                {depositStep === 'submitted' && (
                  <div className="text-center py-8">
                    <div className="w-20 h-20 bg-profit/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="w-10 h-10 text-profit" />
                    </div>
                    <h2 className="text-2xl font-bold text-cream mb-2">Deposit Submitted!</h2>
                    <p className="text-cream/60 mb-6 max-w-md mx-auto">
                      Your deposit request has been submitted. Our team will verify and credit your
                      account within 1-24 hours.
                    </p>

                    <div className="p-4 bg-gold/10 rounded-xl border border-gold/20 mb-6 max-w-md mx-auto">
                      <p className="text-sm text-cream/70">
                        Amount:{' '}
                        <span className="text-cream font-semibold">
                          ${parseFloat(amount || '0').toLocaleString()}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={resetDeposit}
                        className="px-6 py-3 bg-gold text-void font-semibold rounded-xl hover:bg-gold/90 transition-colors"
                      >
                        Make Another Deposit
                      </button>
                      <Link
                        href="/dashboard"
                        className="px-6 py-3 bg-white/10 text-cream font-semibold rounded-xl hover:bg-white/20 transition-colors"
                      >
                        Go to Dashboard
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'withdraw' && (
              <div className="bg-white/5 rounded-2xl border border-white/5 p-5">
                <h2 className="text-lg font-semibold text-cream mb-4">Withdraw Funds</h2>

                {isFromInvestment && incomingPlanName && (
                  <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-gradient-to-r from-electric/10 to-gold/10 border border-electric/30 rounded-2xl flex items-center gap-3"
                  >
                    <ArrowDownCircle className="w-5 h-5 text-gold flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-cream">
                        Withdrawing from <span className="text-gold">{incomingPlanName}</span>
                      </p>
                      <p className="text-sm text-cream/70">
                        The full current value of your investment account will be returned to your
                        available wallet balance after admin approval.
                      </p>
                    </div>
                  </motion.div>
                )}

                {availableBalance === 0 ? (
                  <div className="text-center py-12">
                    <Wallet className="w-12 h-12 text-cream/20 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-cream mb-2">No Funds to Withdraw</h3>
                    <p className="text-cream/60 mb-4">
                      Deposit funds first before you can withdraw.
                    </p>
                    <button
                      onClick={() => setActiveTab('deposit')}
                      className="px-6 py-3 bg-gold text-void font-semibold rounded-xl hover:bg-gold/90 transition-colors"
                    >
                      Make a Deposit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-xs text-cream/50 mb-1">Available for Withdrawal</p>
                      <p className="text-3xl font-bold text-cream">
                        ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {withdrawSuccess && (
                      <div className="p-4 bg-profit/10 border border-profit/20 rounded-xl">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-profit flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-profit">
                              Withdrawal request submitted
                            </p>
                            <p className="text-xs text-cream/60 mt-1">
                              Your request is now pending review. Once approved, the payout
                              will be processed and status will update here.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {withdrawError && (
                      <div className="p-4 bg-loss/10 border border-loss/20 rounded-xl">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-loss flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-loss">{withdrawError}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-cream/60 mb-2 block">Withdrawal Asset</label>
                        <select
                          value={withdrawAssetId}
                          onChange={(e) => setWithdrawAssetId(e.target.value)}
                          className="w-full px-4 py-3 bg-void/50 border border-white/10 rounded-xl text-cream focus:border-gold focus:outline-none"
                        >
                          {withdrawAssets.map((asset) => (
                            <option key={asset.id} value={asset.id} className="bg-[#0d1117]">
                              {asset.symbol} • {asset.network}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-sm text-cream/60 mb-2 block">Amount (USD)</label>
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="Minimum 500"
                          className="w-full px-4 py-3 bg-void/50 border border-white/10 rounded-xl text-cream focus:border-gold focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-cream/60 mb-2 block">
                        Destination Wallet Address
                      </label>
                      <input
                        type="text"
                        value={withdrawAddress}
                        onChange={(e) => setWithdrawAddress(e.target.value)}
                        placeholder={`Enter your ${selectedWithdrawAsset?.symbol || 'crypto'} wallet address`}
                        className="w-full px-4 py-3 bg-void/50 border border-white/10 rounded-xl text-cream focus:border-gold focus:outline-none"
                      />
                      <p className="text-xs text-cream/40 mt-2">
                        Make sure the address matches the selected network exactly. Wrong network =
                        lost funds.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm text-cream/60 mb-2 block">
                        Memo / Tag / Note <span className="text-cream/40">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={withdrawMemo}
                        onChange={(e) => setWithdrawMemo(e.target.value)}
                        placeholder="Memo, tag, or any payout note"
                        className="w-full px-4 py-3 bg-void/50 border border-white/10 rounded-xl text-cream focus:border-gold focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[500, 1000, 2000, 5000, 10000, 20000, 50000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setWithdrawAmount(String(amt))}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            withdrawAmount === String(amt)
                              ? 'bg-gold text-void'
                              : 'bg-white/5 text-cream/60 hover:bg-white/10 hover:text-cream'
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                      <button
                        onClick={() => setWithdrawAmount(String(availableBalance))}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white/5 text-cream/60 hover:bg-white/10 hover:text-cream"
                      >
                        Max
                      </button>
                    </div>

                    <div className="p-4 bg-gold/10 rounded-xl border border-gold/20">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-cream/60">Status after submit</span>
                          <span className="text-yellow-400 font-medium">Pending</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cream/60">Minimum withdrawal</span>
                          <span className="text-cream">$500</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cream/60">Withdrawal fee</span>
                          <span className="text-cream">0%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cream/60">Processing time</span>
                          <span className="text-cream">Up to 24 hours</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitWithdrawal}
                      disabled={
                        withdrawIsSubmitting ||
                        !selectedWithdrawAsset ||
                        !withdrawAmount ||
                        !withdrawAddress ||
                        Number(withdrawAmount) < 500 ||
                        Number(withdrawAmount) > availableBalance
                      }
                      className="w-full py-3 bg-gold text-void font-semibold rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {withdrawIsSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" /> Submit Withdrawal Request
                        </>
                      )}
                    </button>

                    <div className="p-3 bg-white/5 rounded-xl flex items-start gap-2">
                      <Info className="w-4 h-4 text-cream/40 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-cream/40">
                        After submission, this request stays pending until admin approves or rejects
                        it. Approved withdrawals can later be marked paid with a transaction hash.
                      </p>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-cream">
                          Recent Withdrawal Requests
                        </h3>
                        <button
                          onClick={() => void loadWithdrawalsFromDB()}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-cream/40 transition-colors"
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${withdrawalsLoading ? 'animate-spin' : ''}`}
                          />
                        </button>
                      </div>

                      {withdrawalsLoading && dbWithdrawals.length === 0 ? (
                        <div className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-gold mx-auto mb-3" />
                          <p className="text-sm text-cream/60">Loading withdrawals...</p>
                        </div>
                      ) : dbWithdrawals.length === 0 ? (
                        <div className="text-center py-8 bg-white/5 rounded-xl border border-white/5">
                          <Clock className="w-10 h-10 text-cream/20 mx-auto mb-3" />
                          <p className="text-sm text-cream/60">No withdrawal requests yet.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {dbWithdrawals.slice(0, 5).map((item) => (
                            <div
                              key={item.id}
                              className="p-4 bg-white/5 rounded-xl border border-white/5"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-cream">
                                    ${Number(item.amount).toLocaleString()} • {item.asset}
                                  </p>
                                  <p className="text-xs text-cream/50">
                                    {item.network} • {new Date(item.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <span
                                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                                    item.status === 'approved' || item.status === 'paid'
                                      ? 'bg-profit/10 text-profit'
                                      : item.status === 'rejected'
                                        ? 'bg-loss/10 text-loss'
                                        : 'bg-yellow-500/10 text-yellow-500'
                                  }`}
                                >
                                  {item.status === 'paid'
                                    ? 'Paid'
                                    : item.status === 'approved'
                                      ? 'Approved'
                                      : item.status === 'rejected'
                                        ? 'Rejected'
                                        : 'Pending'}
                                </span>
                              </div>

                              <p className="mt-2 text-[11px] text-cream/35 font-mono truncate">
                                To: {item.destinationAddress}
                              </p>

                              {item.rejectionReason && (
                                <div className="mt-2 p-2 bg-loss/5 border border-loss/10 rounded-lg">
                                  <p className="text-xs text-loss">{item.rejectionReason}</p>
                                </div>
                              )}

                              {item.adminNote && item.status !== 'rejected' && (
                                <div className="mt-2 p-2 bg-white/5 border border-white/5 rounded-lg">
                                  <p className="text-xs text-cream/60">{item.adminNote}</p>
                                </div>
                              )}

                              {item.txHash && (
                                <p className="mt-2 text-[10px] text-cream/30 font-mono truncate">
                                  TX: {item.txHash}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="bg-white/5 rounded-2xl border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-cream">Deposit History</h2>
                    <button
                      onClick={() => void loadDepositsFromDB()}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-cream/40 transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${depositsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {depositsLoading && userDeposits.length === 0 ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
                      <p className="text-cream/60">Loading deposits...</p>
                    </div>
                  ) : userDeposits.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 text-cream/20 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-cream mb-2">No Deposits Yet</h3>
                      <p className="text-cream/60">Your deposit history will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userDeposits.map((deposit: any) => (
                        <div
                          key={deposit.id}
                          className="p-4 bg-white/5 rounded-xl border border-white/5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  deposit.status === 'confirmed' || deposit.status === 'approved'
                                    ? 'bg-profit/10'
                                    : deposit.status === 'rejected'
                                      ? 'bg-loss/10'
                                      : 'bg-yellow-500/10'
                                }`}
                              >
                                {deposit.status === 'confirmed' || deposit.status === 'approved' ? (
                                  <CheckCircle2 className="w-5 h-5 text-profit" />
                                ) : deposit.status === 'rejected' ? (
                                  <XCircle className="w-5 h-5 text-loss" />
                                ) : (
                                  <Clock className="w-5 h-5 text-yellow-500" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-cream">
                                  ${Number(deposit.amount).toLocaleString()}
                                </p>
                                <p className="text-xs text-cream/50">{deposit.methodName}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  deposit.status === 'confirmed' || deposit.status === 'approved'
                                    ? 'bg-profit/10 text-profit'
                                    : deposit.status === 'rejected'
                                      ? 'bg-loss/10 text-loss'
                                      : 'bg-yellow-500/10 text-yellow-500'
                                }`}
                              >
                                {deposit.status === 'confirmed'
                                  ? 'Confirmed'
                                  : deposit.status === 'approved'
                                    ? 'Approved'
                                    : deposit.status}
                              </span>
                              <p className="text-xs text-cream/40 mt-1">
                                {new Date(deposit.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {deposit.status === 'rejected' && deposit.rejectionReason && (
                            <div className="mt-2 p-2 bg-loss/5 border border-loss/10 rounded-lg">
                              <p className="text-xs text-loss">{deposit.rejectionReason}</p>
                            </div>
                          )}

                          {deposit.txHash && (
                            <p className="mt-1 text-[10px] text-cream/30 font-mono truncate">
                              TX: {deposit.txHash}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white/5 rounded-2xl border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-cream">Withdrawal History</h2>
                    <button
                      onClick={() => void loadWithdrawalsFromDB()}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-cream/40 transition-colors"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${withdrawalsLoading ? 'animate-spin' : ''}`}
                      />
                    </button>
                  </div>

                  {withdrawalsLoading && dbWithdrawals.length === 0 ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-4" />
                      <p className="text-cream/60">Loading withdrawals...</p>
                    </div>
                  ) : dbWithdrawals.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 text-cream/20 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-cream mb-2">No Withdrawals Yet</h3>
                      <p className="text-cream/60">Your withdrawal requests will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dbWithdrawals.map((item) => (
                        <div key={item.id} className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  item.status === 'approved' || item.status === 'paid'
                                    ? 'bg-profit/10'
                                    : item.status === 'rejected'
                                      ? 'bg-loss/10'
                                      : 'bg-yellow-500/10'
                                }`}
                              >
                                {item.status === 'approved' || item.status === 'paid' ? (
                                  <CheckCircle2 className="w-5 h-5 text-profit" />
                                ) : item.status === 'rejected' ? (
                                  <XCircle className="w-5 h-5 text-loss" />
                                ) : (
                                  <Clock className="w-5 h-5 text-yellow-500" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-cream">
                                  ${Number(item.amount).toLocaleString()} • {item.asset}
                                </p>
                                <p className="text-xs text-cream/50">
                                  {item.network || 'Network not set'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  item.status === 'approved' || item.status === 'paid'
                                    ? 'bg-profit/10 text-profit'
                                    : item.status === 'rejected'
                                      ? 'bg-loss/10 text-loss'
                                      : 'bg-yellow-500/10 text-yellow-500'
                                }`}
                              >
                                {item.status === 'paid'
                                  ? 'Paid'
                                  : item.status === 'approved'
                                    ? 'Approved'
                                    : item.status === 'rejected'
                                      ? 'Rejected'
                                      : 'Pending'}
                              </span>
                              <p className="text-xs text-cream/40 mt-1">
                                {new Date(item.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <p className="mt-2 text-[10px] text-cream/30 font-mono truncate">
                            To: {item.destinationAddress}
                          </p>

                          {item.rejectionReason && (
                            <div className="mt-2 p-2 bg-loss/5 border border-loss/10 rounded-lg">
                              <p className="text-xs text-loss">{item.rejectionReason}</p>
                            </div>
                          )}

                          {item.adminNote && item.status !== 'rejected' && (
                            <div className="mt-2 p-2 bg-white/5 border border-white/5 rounded-lg">
                              <p className="text-xs text-cream/60">{item.adminNote}</p>
                            </div>
                          )}

                          {item.txHash && (
                            <p className="mt-2 text-[10px] text-cream/30 font-mono truncate">
                              TX: {item.txHash}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 rounded-2xl border border-white/5 p-5">
              <h3 className="text-lg font-semibold text-cream mb-4">Need Help?</h3>
              <button
                onClick={openSupportChat}
                className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-gold" />
                <span className="text-sm text-cream">Open Support Chat</span>
                <ChevronRight className="w-4 h-4 text-cream/30 ml-auto" />
              </button>
              <p className="text-xs text-slate-400 mt-3">
                Use the in-app support chat for deposit, withdrawal, or account help.
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl border border-white/5 p-5">
              <h3 className="text-lg font-semibold text-cream mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/dashboard/trade/fx"
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <TrendingUp className="w-5 h-5 text-gold" />
                  <span className="text-sm text-cream">Trade Forex</span>
                  <ChevronRight className="w-4 h-4 text-cream/30 ml-auto" />
                </Link>

                <Link
                  href="/dashboard/trade/crypto"
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <Bitcoin className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-cream">Trade Crypto</span>
                  <ChevronRight className="w-4 h-4 text-cream/30 ml-auto" />
                </Link>

                <Link
                  href="/dashboard/bridge"
                  className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <Globe className="w-5 h-5 text-electric" />
                  <span className="text-sm text-cream">SwiftBridge</span>
                  <ChevronRight className="w-4 h-4 text-cream/30 ml-auto" />
                </Link>
              </div>
            </div>

            <div className="p-4 bg-electric/5 rounded-xl border border-electric/20">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-electric flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-cream">Secure Deposits & Withdrawals</p>
                  <p className="text-xs text-slate-400 mt-1">
                    All payout requests are reviewed manually before funds are released.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </KYCGate>
  );
}

export default function WalletPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 lg:p-6 max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-white/10 rounded w-32 mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-48 mb-6"></div>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="h-32 bg-white/5 rounded-2xl"></div>
              <div className="h-32 bg-white/5 rounded-2xl"></div>
            </div>
          </div>
        </div>
      }
    >
      <WalletContent />
    </Suspense>
  );
}

