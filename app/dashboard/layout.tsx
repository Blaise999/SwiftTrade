// app/dashboard/layout.tsx (or your DashboardLayout file)
'use client';

import { useState, useEffect, type ReactNode, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  LayoutDashboard,
  LineChart,
  Wallet,
  Users,
  Settings,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Shield,
  HelpCircle,
  CreditCard,
  History,
  Bitcoin,
  DollarSign,
  BarChart3,
  Globe,
} from 'lucide-react';

import { useStore } from '@/lib/supabase/store-supabase';
import { useUIStore } from '@/lib/ui-store';
import { useTradingAccountStore } from '@/lib/trading-store';

import SupportWidget from '@/components/SupportWidget';
import NotificationPanel from '@/components/NotificationPanel';
import StockPriceSync from '@/components/StockPriceSync';
import MobileBottomNav from '@/components/MobileBottomNav';
import ThemeToggle from '@/components/ThemeToggle';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Trade',
    icon: LineChart,
    children: [
      { name: 'Cryptocurrency', href: '/dashboard/crypto', icon: Bitcoin },
      { name: 'Forex', href: '/dashboard/trade/fx', icon: DollarSign },
      { name: 'Stocks', href: '/dashboard/trade/stocks', icon: BarChart3 },
    ],
  },
  { name: 'SwiftBridge', href: '/dashboard/bridge', icon: Globe, badge: 'NEW' },
  { name: 'Portfolio', href: '/dashboard/portfolio', icon: BarChart3 },
  { name: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
  { name: 'History', href: '/dashboard/history', icon: History },
  { name: 'Referrals', href: '/dashboard/referrals', icon: Users },
  { name: 'Connect Wallet', href: '/dashboard/connect-wallet', icon: Wallet },
];

const bottomNav = [
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Help', href: '/dashboard/help', icon: HelpCircle },
];

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const { user, logout, isAuthenticated, isLoading, refreshUser } = useStore();
  const { sidebarOpen, toggleSidebar, mobileMenuOpen, toggleMobileMenu } = useUIStore();

  // FX wants the whole screen — collapse the sidebar when the chart is open.
  useEffect(() => {
    if (pathname?.startsWith('/dashboard/trade/fx') && sidebarOpen) toggleSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const initializeAccounts = useTradingAccountStore((s) => s.initializeAccounts);
  const syncBalanceFromUser = useTradingAccountStore((s) => s.syncBalanceFromUser);
  const loadStocksFromSupabase = useTradingAccountStore((s) => s.loadStocksFromSupabase);
  const spotUserId = useTradingAccountStore((s) => s.spotAccount?.userId);

  const [expandedMenu, setExpandedMenu] = useState<string | null>('Trade');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // for outside click
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // ✅ SINGLE SOURCE OF TRUTH FOR DISPLAY
  const cash = useMemo(() => {
    if (!user) return 0;
    return n((user as any)?.balance_available) || n((user as any)?.balanceAvailable) || n((user as any)?.balance) || 0;
  }, [user]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login');
  }, [isLoading, isAuthenticated, router]);

  // Keep user fresh
  useEffect(() => {
    if (!user?.id) return;
    refreshUser?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ✅ keep trading store synced
  useEffect(() => {
    if (!user?.id) return;

    if (!spotUserId || spotUserId !== user.id) {
      initializeAccounts(user.id, cash);
      loadStocksFromSupabase(user.id, cash).catch(() => {});
      return;
    }

    syncBalanceFromUser(cash);
  }, [
    user?.id,
    user?.id ? user.id : undefined,
    cash,
    spotUserId,
    initializeAccounts,
    loadStocksFromSupabase,
    syncBalanceFromUser,
  ]);

  // ✅ CRITICAL: never let overlays block clicks across routes
  useEffect(() => {
    // close any dropdown/menu on navigation
    setShowUserMenu(false);

    // close mobile overlay on route change if open
    if (mobileMenuOpen) toggleMobileMenu();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ✅ Close mobile overlay if viewport becomes desktop (lg+)
  useEffect(() => {
    if (!mobileMenuOpen) return;
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(min-width: 1024px)');
    if (mq.matches) toggleMobileMenu();

    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) toggleMobileMenu();
    };

    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileMenuOpen]);

  // ✅ Outside click to close user menu (prevents invisible overlays)
  useEffect(() => {
    if (!showUserMenu) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = userMenuRef.current;
      if (!el) return;
      const t = e.target as Node | null;
      if (t && el.contains(t)) return;
      setShowUserMenu(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUserMenu(false);
    };

    document.addEventListener('mousedown', onDown, { passive: true });
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showUserMenu]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="animate-spin w-7 h-7 border-2 border-pearl-100/20 border-t-champagne-300 rounded-full" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const isActive = (href: string) => pathname === href;
  const isChildActive = (children: any[]) => children?.some((child) => pathname === child.href);

  const formatCash = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="font-app min-h-screen text-pearl-50 flex selection:bg-champagne-400/30">
      <StockPriceSync />

      {/* ─────────── AMBIENT BACKDROP (behind every page) ─────────── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-40 -right-32 w-[640px] h-[640px] rounded-full blur-[140px] opacity-[0.16]"
          style={{ background: 'radial-gradient(closest-side, var(--gold), transparent 70%)' }}
        />
        <div
          className="absolute top-1/3 -left-40 w-[560px] h-[560px] rounded-full blur-[150px] opacity-[0.10]"
          style={{ background: 'radial-gradient(closest-side, var(--profit), transparent 70%)' }}
        />
        <div
          className="absolute -bottom-48 right-1/4 w-[520px] h-[520px] rounded-full blur-[150px] opacity-[0.08]"
          style={{ background: 'radial-gradient(closest-side, var(--electric), transparent 70%)' }}
        />
        {/* faint dot grid for texture */}
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'radial-gradient(var(--wash) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse at 50% 0%, black, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black, transparent 80%)',
          }}
        />
      </div>


      {/* ─────────── DESKTOP SIDEBAR ─────────── */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-obsidian/80 backdrop-blur-xl border-r border-pearl-100/[0.05] transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-[76px]'
        }`}
      >
        {/* Brand */}
        <div className="h-[68px] flex items-center justify-between px-5 border-b border-pearl-100/[0.05]">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex-shrink-0"><svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-label="Swifttrade"><rect x="0.5" y="0.5" width="39" height="39" rx="9" fill="var(--panel)" stroke="var(--line-strong)" /><path d="M9 15 L18 10 L24 14 L31 10" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 24 L16 27 L23 22 L31 26" stroke="var(--electric)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            {sidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="leading-none">
                <div className="font-app font-bold text-pearl-50 text-base tracking-tight">Swift<span style={{ color: 'var(--gold)' }}>trade</span></div>
                <div className="text-[9px] text-pearl-300/60 tracking-[0.25em] uppercase mt-0.5">Console</div>
              </motion.div>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 scrollbar-none">
          <ul className="space-y-0.5">
            {navigation.map((item) => (
              <li key={item.name}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => setExpandedMenu(expandedMenu === item.name ? null : item.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isChildActive(item.children)
                          ? 'bg-pearl-50/[0.04] text-pearl-50'
                          : 'text-pearl-300/70 hover:text-pearl-100 hover:bg-pearl-50/[0.02]'
                      }`}
                    >
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                      {sidebarOpen && (
                        <>
                          <span className="flex-1 text-left text-[13.5px] font-medium">{item.name}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedMenu === item.name ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </button>

                    <AnimatePresence>
                      {sidebarOpen && expandedMenu === item.name && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden ml-4 mt-1 mb-1 space-y-0.5 border-l border-pearl-100/[0.06]"
                        >
                          {item.children.map((child) => (
                            <li key={child.name}>
                              <Link
                                href={child.href}
                                className={`flex items-center gap-3 pl-4 pr-3 py-1.5 rounded-r-md transition-all ${
                                  isActive(child.href)
                                    ? 'text-champagne-300 border-l-2 border-champagne-400 -ml-px'
                                    : 'text-pearl-300/60 hover:text-pearl-100'
                                }`}
                              >
                                <child.icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                                <span className="text-[12.5px]">{child.name}</span>
                              </Link>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      isActive(item.href)
                        ? 'bg-pearl-50/[0.04] text-pearl-50'
                        : 'text-pearl-300/70 hover:text-pearl-100 hover:bg-pearl-50/[0.02]'
                    }`}
                  >
                    <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                    {sidebarOpen && <span className="text-[13.5px] font-medium flex-1">{item.name}</span>}
                    {sidebarOpen && (item as any).badge && (
                      <span className="text-[9px] tracking-wider bg-champagne-400/15 text-champagne-300 px-1.5 py-0.5 rounded font-medium border border-champagne-400/25">
                        {(item as any).badge}
                      </span>
                    )}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="border-t border-pearl-100/[0.05] py-3 px-3 space-y-0.5">
          {bottomNav.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive(item.href) ? 'bg-pearl-50/[0.04] text-pearl-50' : 'text-pearl-300/70 hover:text-pearl-100 hover:bg-pearl-50/[0.02]'
              }`}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
              {sidebarOpen && <span className="text-[13.5px] font-medium">{item.name}</span>}
            </Link>
          ))}
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-pearl-300/50 hover:text-pearl-100 hover:bg-pearl-50/[0.02] transition-all"
          >
            <ChevronDown className={`w-[18px] h-[18px] flex-shrink-0 transition-transform ${sidebarOpen ? 'rotate-90' : '-rotate-90'}`} strokeWidth={1.75} />
            {sidebarOpen && <span className="text-[13.5px] font-medium">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ─────────── MOBILE OVERLAY ─────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleMobileMenu}
              className="lg:hidden fixed inset-0 bg-void/80 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-obsidian border-r border-pearl-100/[0.05] z-50 flex flex-col"
            >
              <div className="h-[68px] flex items-center justify-between px-5 border-b border-pearl-100/[0.05]">
                <Link href="/dashboard" className="flex items-center gap-2.5">
                  <div className="flex-shrink-0"><svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-label="Swifttrade"><rect x="0.5" y="0.5" width="39" height="39" rx="9" fill="var(--panel)" stroke="var(--line-strong)" /><path d="M9 15 L18 10 L24 14 L31 10" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 24 L16 27 L23 22 L31 26" stroke="var(--electric)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                  <div className="leading-none">
                    <div className="font-app font-bold text-pearl-50 text-base tracking-tight">Swift<span style={{ color: 'var(--gold)' }}>trade</span></div>
                    <div className="text-[9px] text-pearl-300/60 tracking-[0.25em] uppercase mt-0.5">Console</div>
                  </div>
                </Link>
                <button onClick={toggleMobileMenu} className="p-2 text-pearl-300/70">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto py-4 px-3">
                <ul className="space-y-0.5">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      {item.children ? (
                        <div>
                          <div className="px-3 py-2 text-[10px] uppercase tracking-[0.25em] text-pearl-300/40 font-semibold">
                            {item.name}
                          </div>
                          {item.children.map((child) => (
                            <Link
                              key={child.name}
                              href={child.href}
                              onClick={toggleMobileMenu}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                                isActive(child.href)
                                  ? 'bg-pearl-50/[0.04] text-pearl-50'
                                  : 'text-pearl-300/70 hover:text-pearl-100 hover:bg-pearl-50/[0.02]'
                              }`}
                            >
                              <child.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                              <span className="text-sm">{child.name}</span>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={toggleMobileMenu}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                            isActive(item.href)
                              ? 'bg-pearl-50/[0.04] text-pearl-50'
                              : 'text-pearl-300/70 hover:text-pearl-100 hover:bg-pearl-50/[0.02]'
                          }`}
                        >
                          <item.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                          <span className="text-sm font-medium flex-1">{item.name}</span>
                          {(item as any).badge && (
                            <span className="text-[9px] tracking-wider bg-champagne-400/15 text-champagne-300 px-1.5 py-0.5 rounded font-medium border border-champagne-400/25">
                              {(item as any).badge}
                            </span>
                          )}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─────────── MAIN ─────────── */}
      <div className={`flex-1 min-w-0 max-w-full overflow-x-hidden flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-[76px]'}`}>
        <header className="h-[68px] bg-void/70 backdrop-blur-2xl border-b border-pearl-100/[0.05] flex items-center justify-between px-5 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={toggleMobileMenu} className="lg:hidden p-2 text-pearl-300/70">
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-pearl-50/[0.03] rounded-full border border-pearl-100/[0.06]">
              <Search className="w-3.5 h-3.5 text-pearl-300/40" />
              <input
                type="text"
                placeholder="Search assets, traders…"
                className="bg-transparent text-[13px] text-pearl-50 placeholder:text-pearl-300/40 focus:outline-none w-44 lg:w-60"
              />
              <kbd className="hidden lg:inline text-[10px] text-pearl-300/40 px-1.5 py-0.5 bg-pearl-50/[0.04] rounded font-mono">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Balance pill */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-pearl-50/[0.03] rounded-full border border-pearl-100/[0.06]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-pearl-300/45">Balance</span>
              <span className="text-[13px] font-mono text-pearl-50">{formatCash(cash)}</span>
            </div>

            {/* Wallet status */}
            {user.walletAddress ? (
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-profit/[0.08] rounded-full border border-profit/20">
                <div className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
                <span className="text-[11px] font-mono text-profit">
                  {user.walletAddress.slice(0, 6)}…{user.walletAddress.slice(-4)}
                </span>
              </div>
            ) : (
              <Link
                href="/dashboard/connect-wallet"
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-pearl-50/[0.03] rounded-full border border-pearl-100/[0.06] hover:border-pearl-100/15 transition-colors group"
              >
                <Wallet className="w-3.5 h-3.5 text-pearl-300/50 group-hover:text-pearl-100 transition-colors" />
                <span className="text-[11px] text-pearl-300/60 group-hover:text-pearl-100 transition-colors">Connect</span>
              </Link>
            )}

            <Link
              href="/dashboard/wallet"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-pearl-50 hover:bg-pearl-100 text-void text-[13px] font-medium rounded-full transition-all"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Deposit
            </Link>

            <ThemeToggle />

            <NotificationPanel />

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-pearl-50/[0.04] transition-colors"
              >
                <div className="w-9 h-9 bg-gradient-to-br from-sapphire-400 to-sapphire-700 rounded-full flex items-center justify-center text-pearl-50 text-[13px] font-medium">
                  {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                </div>
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-64 bg-charcoal border border-pearl-100/[0.08] rounded-xl shadow-card overflow-hidden"
                  >
                    <div className="p-4 border-b border-pearl-100/[0.05]">
                      <p className="text-sm font-medium text-pearl-50">{user.firstName || user.email.split('@')[0]} {user.lastName || ''}</p>
                      <p className="text-xs text-pearl-300/55 mt-0.5">{user.email}</p>
                      {user.walletAddress && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-profit" />
                          <p className="text-[11px] text-profit font-mono">
                            {user.walletAddress.slice(0, 6)}…{user.walletAddress.slice(-4)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="py-1.5">
                      <Link href="/dashboard/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-[13px] text-pearl-200/80 hover:text-pearl-50 hover:bg-pearl-50/[0.03] transition-colors">
                        <User className="w-3.5 h-3.5" /> Profile
                      </Link>
                      <Link href="/dashboard/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-[13px] text-pearl-200/80 hover:text-pearl-50 hover:bg-pearl-50/[0.03] transition-colors">
                        <Shield className="w-3.5 h-3.5" /> Security
                      </Link>
                      <Link href="/dashboard/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-4 py-2 text-[13px] text-pearl-200/80 hover:text-pearl-50 hover:bg-pearl-50/[0.03] transition-colors">
                        <Settings className="w-3.5 h-3.5" /> Settings
                      </Link>
                    </div>

                    <div className="border-t border-pearl-100/[0.05] py-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-loss/90 hover:bg-loss/[0.08] transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className={`flex-1 min-w-0 max-w-full ${pathname?.startsWith('/dashboard/trade/fx') ? 'overflow-hidden' : 'px-4 sm:px-6 lg:px-10 py-8 pb-28 lg:pb-8 overflow-x-hidden'}`}>{children}</main>
      </div>

      <SupportWidget />
      <MobileBottomNav />
    </div>
  );
}
