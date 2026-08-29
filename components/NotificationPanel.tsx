// components/NotificationPanel.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { ActivitySymbol, extractSymbol, kindAccent } from '@/components/ActivitySymbol';
import {
  Bell,
  CheckCircle,
  Gift,
  TrendingUp,
  Shield,
  AlertCircle,
  Info,
  CreditCard,
  CheckCheck,
} from 'lucide-react';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

const typeIcons: Record<string, React.ReactNode> = {
  tier_purchase: <Shield className="w-4 h-4 text-gold" />,
  deposit: <CreditCard className="w-4 h-4 text-profit" />,
  withdrawal: <CreditCard className="w-4 h-4 text-electric" />,
  bonus: <Gift className="w-4 h-4 text-gold" />,
  trade: <TrendingUp className="w-4 h-4 text-electric" />,
  alert: <AlertCircle className="w-4 h-4 text-loss" />,
  success: <CheckCircle className="w-4 h-4 text-profit" />,
  info: <Info className="w-4 h-4 text-[var(--accent-3)]" />,
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markRead,
    markAllRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Load notifications when opening
  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) loadNotifications();
  };

  const handleClick = (n: Notification) => {
    if (!n.read_at) markRead(n.id);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-[var(--text-3)] hover:text-[var(--text)] transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF4D3D] text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <>
          {/* mobile backdrop */}
          <div className="fixed inset-0 z-[59] bg-black/50 sm:hidden" onClick={() => setIsOpen(false)} />
          <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[22rem] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl z-[60] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text)]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[var(--accent-2)] hover:opacity-80 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[65vh] sm:max-h-80 overflow-y-auto overscroll-contain">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[var(--text-3)] mt-2">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-[var(--text-3)] mx-auto mb-2" />
                <p className="text-sm text-[var(--text-3)]">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`relative w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-[var(--inset)] transition-colors border-b border-[var(--border)] last:border-0 ${
                    !n.read_at ? 'bg-white/[0.03]' : ''
                  }`}
                >
                  {!n.read_at && (
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full"
                      style={{ background: kindAccent(n.type) }} />
                  )}
                  <ActivitySymbol
                    kind={n.type}
                    symbol={extractSymbol(n.title, (n as any).symbol ?? (n as any).metadata?.symbol)}
                    currency={(n as any).metadata?.currency}
                    size={38}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-[13.5px] font-semibold truncate ${!n.read_at ? 'text-[var(--text)]' : 'text-[var(--text-3)]'}`}>
                        {n.title}
                      </p>
                      {!n.read_at && (
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: kindAccent(n.type) }} />
                      )}
                    </div>
                    {n.message && (
                      <p className="text-[11.5px] text-[var(--text-3)] mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9.5px] uppercase tracking-[0.14em] font-bold px-1.5 py-0.5 rounded"
                        style={{ color: kindAccent(n.type), background: `color-mix(in srgb, ${kindAccent(n.type)} 14%, transparent)` }}>
                        {String(n.type).replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-[var(--text-3)]/70">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
