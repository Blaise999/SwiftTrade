'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  RefreshCw,
  Play,
  Pause,
  Square,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Zap,
  BookOpen,
  Plus,
  Send,
  MessageCircle,
  Copy,
  Clock,
} from 'lucide-react';
import { useAdminAuthStore } from '@/lib/admin-store';

function getStorageToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    window.sessionStorage.getItem('swifttrade_admin_token') ||
    window.localStorage.getItem('swifttrade_admin_token') ||
    null
  );
}

function getAdminToken(a: any, st?: string | null): string | null {
  if (st) return st;
  return a?.sessionToken || a?.session_token || a?.token || a?.access_token || getStorageToken();
}

function fmt(n: number | null | undefined, dp = 2): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toFixed(dp);
}

const SESSION_TYPES = ['bullish', 'bearish', 'range', 'reversal', 'crash', 'spike', 'custom'] as const;
const DURATIONS = [
  { label: '2m', ms: 120000 },
  { label: '5m', ms: 300000 },
  { label: '10m', ms: 600000 },
  { label: '15m', ms: 900000 },
  { label: '30m', ms: 1800000 },
];

type SignalContext =
  | {
      action: 'session_created';
      symbol: string;
      sessionType: string;
      startBid: number;
      targetBid: number;
      durationLabel: string;
      instructions?: string;
    }
  | {
      action: 'price_override';
      symbol: string;
      oldBid: number;
      newBid: number;
      newAsk: number;
    }
  | { action: 'trade_closed'; symbol: string; reason: string; count: number };

function directionFromSession(type: string, startBid: number, targetBid: number): 'BUY' | 'SELL' {
  if (type === 'bullish' || type === 'spike') return 'BUY';
  if (type === 'bearish' || type === 'crash') return 'SELL';
  return targetBid >= startBid ? 'BUY' : 'SELL';
}

function estimateProfit(startBid: number, targetBid: number): string {
  if (startBid <= 0) return '5-15%';
  const pct = Math.abs(((targetBid - startBid) / startBid) * 100);
  const profitPct = Math.round(pct * 100);
  if (profitPct > 200) return '+200%';
  if (profitPct > 100) return `+${profitPct}%`;
  if (profitPct > 10) return `+${profitPct}%`;
  return '+10-30%';
}

function generateSignalMessage(ctx: SignalContext): string {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });

  if (ctx.action === 'session_created') {
    const dir = directionFromSession(ctx.sessionType, ctx.startBid, ctx.targetBid);
    const emoji = dir === 'BUY' ? '🟢' : '🔴';
    const profitEst = estimateProfit(ctx.startBid, ctx.targetBid);

    const lines = [
      `🚨 *LIVE SIGNAL — ${ctx.symbol}* 🚨`,
      ``,
      `${emoji} *${dir} NOW* — ${ctx.symbol}`,
      ``,
      `💰 Expected profit: *${profitEst}*`,
      `⏱ Duration: *${ctx.durationLabel}*`,
      `📊 Entry: ${ctx.startBid.toFixed(4)} → Target: ${ctx.targetBid.toFixed(4)}`,
      `🕐 ${time} • ${date}`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      ``,
      `📱 *Step by step:*`,
      ``,
      `1️⃣ Open app → *Trade* → *Forex*`,
      `2️⃣ Select *${ctx.symbol}* from the list`,
      `3️⃣ Set investment: *$50 - $200*`,
      `4️⃣ Multiplier: *x100*`,
      `5️⃣ Tap *${dir}*`,
      `6️⃣ Wait ${ctx.durationLabel}, then close for profit`,
      ``,
      `✅ *This signal is active for ${ctx.durationLabel}*`,
    ];

    if (ctx.instructions) {
      lines.push(``, `💡 ${ctx.instructions}`);
    }

    lines.push(
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      `⚠️ Trade responsibly. Only invest what you can afford.`
    );

    return lines.join('\n');
  }

  if (ctx.action === 'price_override') {
    const dir = ctx.newBid > ctx.oldBid ? 'BUY' : 'SELL';
    const emoji = dir === 'BUY' ? '🟢' : '🔴';
    const change = Math.abs(ctx.newBid - ctx.oldBid);
    const pct = ctx.oldBid > 0 ? ((change / ctx.oldBid) * 100).toFixed(2) : '0';
    const profitEst = ctx.oldBid > 0 ? `+${Math.round(parseFloat(pct) * 100)}%` : '+10%';

    return [
      `⚡ *QUICK SIGNAL — ${ctx.symbol}* ⚡`,
      ``,
      `${emoji} *${dir} NOW*`,
      ``,
      `Price moving ${dir === 'BUY' ? '↗️ UP' : '↘️ DOWN'} by ${pct}%`,
      `💰 Potential profit with x100: *${profitEst}*`,
      `📊 Current: *${ctx.newBid.toFixed(4)} / ${ctx.newAsk.toFixed(4)}*`,
      `🕐 ${time}`,
      ``,
      `📱 Open app → Forex → *${ctx.symbol}* → *${dir}*`,
      `💵 Investment: $50-$200 • Multiplier: x100`,
      ``,
      `⚠️ Trade responsibly.`,
    ].join('\n');
  }

  if (ctx.action === 'trade_closed') {
    return [
      `✅ *${ctx.symbol}* — ${ctx.count} trade(s) auto-closed`,
      `📋 Reason: ${ctx.reason}`,
      `🕐 ${time}`,
      ``,
      `Profits have been added to your balance.`,
    ].join('\n');
  }

  return '';
}

export default function AdminDemoFxPage() {
  const store: any = useAdminAuthStore();
  const token = useMemo(
    () => getAdminToken(store?.admin, store?.sessionToken ?? store?.token ?? null),
    [store]
  );

  const [pairs, setPairs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [autoTick, setAutoTick] = useState(false);
  const autoRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const [tickN, setTickN] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [cPairId, setCPairId] = useState('');
  const [cType, setCType] = useState('bullish');
  const [cDur, setCDur] = useState(300000);
  const [cSB, setCSB] = useState('');
  const [cSA, setCSA] = useState('');
  const [cTB, setCTB] = useState('');
  const [cTA, setCTA] = useState('');
  const [cVol, setCVol] = useState('0.0008');
  const [cInstr, setCInstr] = useState('');
  const [creating, setCreating] = useState(false);
  const [cAutoTg, setCAutoTg] = useState(true);
  const [cUseLiveStart, setCUseLiveStart] = useState(true);

  const [showSignal, setShowSignal] = useState(false);
  const [sigPairId, setSigPairId] = useState('');
  const [sigDir, setSigDir] = useState<'buy' | 'sell'>('buy');
  const [sigProfit, setSigProfit] = useState('15');
  const [sigDuration, setSigDuration] = useState('5');
  const [sigTime, setSigTime] = useState('');
  const [sigCreating, setSigCreating] = useState(false);
  const [sigResult, setSigResult] = useState<any>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editBid, setEditBid] = useState('');
  const [editAsk, setEditAsk] = useState('');
  const [editAutoTg, setEditAutoTg] = useState(true);

  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set());

  const [showTgPanel, setShowTgPanel] = useState(false);
  const [tgMessage, setTgMessage] = useState('');
  const [tgSending, setTgSending] = useState(false);

  const apiFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!token) throw new Error('Missing admin token');

      const h: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        ...(init?.headers as any),
      };

      if (init?.body && !h['Content-Type']) {
        h['Content-Type'] = 'application/json';
      }

      const r = await fetch(path, { ...init, headers: h, cache: 'no-store' });
      const j = await r.json().catch(() => ({}));

      if (!r.ok) throw new Error(j?.error || `Failed (${r.status})`);
      return j;
    },
    [token]
  );

  const loadAll = useCallback(async () => {
    try {
      const [p, s, t] = await Promise.all([
        apiFetch('/api/admin/demo-fx/pairs'),
        apiFetch('/api/admin/demo-fx/sessions').catch(() => ({ sessions: [] })),
        apiFetch('/api/admin/demo-fx/trades').catch(() => ({ trades: [] })),
      ]);

      setPairs(p?.pairs || []);
      setSessions(s?.sessions || []);
      setTrades(t?.trades || []);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (token) loadAll();
  }, [loadAll, token]);

  useEffect(() => {
    if (!cUseLiveStart || !cPairId) return;
    const pair = pairs.find((p: any) => p.id === cPairId);
    if (!pair) return;

    setCSB(String(pair.current_bid || pair.default_bid || ''));
    setCSA(String(pair.current_ask || pair.default_ask || ''));
  }, [cUseLiveStart, cPairId, pairs]);

  const sendToTelegram = useCallback(
    async (message: string) => {
      try {
        await apiFetch('/api/admin/telegram', {
          method: 'POST',
          body: JSON.stringify({ action: 'send', message }),
        });
        return true;
      } catch {
        return false;
      }
    },
    [apiFetch]
  );

  const runTick = useCallback(async () => {
    try {
      await apiFetch('/api/admin/demo-fx/session-tick', { method: 'POST' });
      setTickN((c) => c + 1);
      await loadAll();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  }, [apiFetch, loadAll]);

  useEffect(() => {
    autoRef.current = autoTick;

    if (!autoTick) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    let dead = false;

    const loop = async () => {
      if (dead || !autoRef.current) return;
      await runTick();
      if (dead || !autoRef.current) return;
      timerRef.current = window.setTimeout(loop, 1000);
    };

    loop();

    return () => {
      dead = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoTick, runTick]);

  const ctrlSess = async (id: string, action: string) => {
    try {
      await apiFetch('/api/admin/demo-fx/sessions', {
        method: 'PUT',
        body: JSON.stringify({ session_id: id, action }),
      });
      setMsg({ type: 'success', text: `Session ${action}` });
      await loadAll();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const forceStopPair = async (pairId: string) => {
    try {
      await apiFetch('/api/admin/demo-fx/pairs', {
        method: 'POST',
        body: JSON.stringify({
          pair_id: pairId,
          mode: 'manual',
          active_session_id: null,
        }),
      });

      setMsg({ type: 'success', text: 'Pair force-stopped and returned to manual mode' });
      await loadAll();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const handleCreate = async () => {
    if (!cPairId) {
      setMsg({ type: 'error', text: 'Select a pair' });
      return;
    }

    setCreating(true);

    try {
      const res = await apiFetch('/api/admin/demo-fx/sessions', {
        method: 'POST',
        body: JSON.stringify({
          pair_id: cPairId,
          session_type: cType,
          duration_ms: cDur,
          tick_interval_ms: 1000,
          volatility: Number(cVol) || 0.0008,
          start_bid: Number(cSB),
          start_ask: Number(cSA),
          target_bid: Number(cTB),
          target_ask: Number(cTA),
          student_instructions: cInstr || null,
          auto_start: true,
          inherit_live_start: cUseLiveStart,
        }),
      });

      await loadAll();

      const pair = pairs.find((p: any) => p.id === cPairId);
      const createdSession = res?.session;

      const durLabel =
        DURATIONS.find((d) => d.ms === cDur)?.label ||
        `${Math.round(cDur / 60000)}m`;

      const signal = generateSignalMessage({
        action: 'session_created',
        symbol: pair?.symbol || '???',
        sessionType: createdSession?.session_type || cType,
        startBid: Number(createdSession?.start_bid ?? cSB),
        targetBid: Number(createdSession?.target_bid ?? cTB),
        durationLabel: durLabel,
        instructions: cInstr || undefined,
      });

      if (cAutoTg) {
        const sent = await sendToTelegram(signal);
        setMsg({
          type: 'success',
          text: sent
            ? 'Session started + signal sent to Telegram ✈️'
            : 'Session started (Telegram send failed — check Settings)',
        });
      } else {
        setTgMessage(signal);
        setShowTgPanel(true);
        setMsg({ type: 'success', text: 'Session started! Review signal below.' });
      }

      setShowCreate(false);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setCreating(false);
    }
  };

  const saveOverride = async () => {
    if (!editId) return;

    const pair = pairs.find((p: any) => p.id === editId);
    const oldBid = Number(pair?.current_bid || 0);

    try {
      await apiFetch('/api/admin/demo-fx/price-override', {
        method: 'POST',
        body: JSON.stringify({
          pair_id: editId,
          bid: Number(editBid),
          ask: Number(editAsk),
        }),
      });

      await loadAll();

      const signal = generateSignalMessage({
        action: 'price_override',
        symbol: pair?.symbol || '???',
        oldBid,
        newBid: Number(editBid),
        newAsk: Number(editAsk),
      });

      if (editAutoTg) {
        const sent = await sendToTelegram(signal);
        setMsg({
          type: 'success',
          text: sent ? 'Price set + signal sent to Telegram ✈️' : 'Price set + trades repriced (TG failed)',
        });
      } else {
        setMsg({ type: 'success', text: 'Price set + trades repriced' });
      }

      setEditId(null);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const createSignal = async () => {
    if (!sigPairId) {
      setMsg({ type: 'error', text: 'Pick a pair' });
      return;
    }

    setSigCreating(true);

    try {
      let entryTime = sigTime;

      if (!entryTime) {
        const d = new Date(Date.now() + 60000);
        entryTime = `${d.getHours().toString().padStart(2, '0')}:${d
          .getMinutes()
          .toString()
          .padStart(2, '0')}`;
      }

      const res = await apiFetch('/api/admin/demo-fx/create-signal', {
        method: 'POST',
        body: JSON.stringify({
          pair_id: sigPairId,
          direction: sigDir,
          profit_percent: Number(sigProfit),
          duration_minutes: Number(sigDuration),
          entry_time: entryTime,
        }),
      });

      setSigResult(res.signal);
      setAutoTick(true);
      setMsg({
        type: 'success',
        text: res.signal?.telegram_sent
          ? 'Signal live + Telegram sent ✈️'
          : 'Signal live! (Set up Telegram in Settings to auto-send)',
      });

      await loadAll();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setSigCreating(false);
    }
  };

  const adminClose = async (tradeId: string) => {
    try {
      await apiFetch('/api/admin/demo-fx/close-trade', {
        method: 'POST',
        body: JSON.stringify({ trade_id: tradeId }),
      });
      setMsg({ type: 'success', text: 'Trade closed + balance returned' });
      await loadAll();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const sendTgManual = async () => {
    if (!tgMessage.trim()) return;

    setTgSending(true);

    try {
      await sendToTelegram(tgMessage.trim());
      setMsg({ type: 'success', text: 'Signal sent to Telegram ✈️' });
      setShowTgPanel(false);
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setTgSending(false);
    }
  };

  const openTrades = trades.filter((t: any) => t.status === 'open');
  const runningSess = sessions.filter((s: any) => s.status === 'running');

  const tradesByPair = useMemo(() => {
    const m: Record<string, any[]> = {};
    trades.forEach((t: any) => {
      if (!m[t.pair_id]) m[t.pair_id] = [];
      m[t.pair_id].push(t);
    });
    return m;
  }, [trades]);

  const sessByPair = useMemo(() => {
    const m: Record<string, any[]> = {};
    sessions.forEach((s: any) => {
      if (!m[s.pair_id]) m[s.pair_id] = [];
      m[s.pair_id].push(s);
    });
    return m;
  }, [sessions]);

  const prefill = (p: any) => {
    setCPairId(p.id);
    setCSB(String(p.current_bid || p.default_bid || ''));
    setCSA(String(p.current_ask || p.default_ask || ''));
    setCTB(String(Number(p.current_bid || p.default_bid || 0) * 1.01));
    setCTA(String(Number(p.current_ask || p.default_ask || 0) * 1.01));
    setCType('bullish');
    setCDur(300000);
    setCInstr('');
    setCAutoTg(true);
    setCUseLiveStart(true);
    setShowCreate(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-cream">Demo FX Control</h1>
          <p className="text-slate-400 mt-1">Create sessions, set prices, send signals</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setLoading(true);
              loadAll();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl text-sm text-slate-300 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={runTick}
            className="flex items-center gap-2 px-3 py-2 bg-electric/20 text-electric rounded-xl text-sm font-medium hover:bg-electric/30"
          >
            <Zap className="w-4 h-4" />
            Tick
          </button>

          <button
            onClick={() => setAutoTick(!autoTick)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
              autoTick ? 'bg-profit/20 text-profit' : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {autoTick ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {autoTick ? `Auto ON (${tickN})` : 'Auto-Tick'}
          </button>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-3 py-2 bg-loss/20 text-loss rounded-xl text-sm font-medium hover:bg-loss/30"
          >
            <Plus className="w-4 h-4" />
            New Session
          </button>

          <button
            onClick={() => {
              setShowSignal(true);
              setSigResult(null);
              const now = new Date(Date.now() + 60000);
              setSigTime(
                `${now.getHours().toString().padStart(2, '0')}:${now
                  .getMinutes()
                  .toString()
                  .padStart(2, '0')}`
              );
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sapphire-400 to-orange-500 text-void rounded-xl text-sm font-bold hover:opacity-90 shadow-lg"
          >
            <Send className="w-4 h-4" />
            Send Signal
          </button>
        </div>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
              msg.type === 'success' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'
            }`}
          >
            {msg.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {msg.text}
            <button onClick={() => setMsg(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { l: 'Pairs', v: pairs.filter((p: any) => p.is_active).length, c: 'text-cream' },
          { l: 'Running', v: runningSess.length, c: 'text-electric' },
          { l: 'Open Trades', v: openTrades.length, c: 'text-champagne-300' },
          { l: 'Ticks', v: tickN, c: 'text-slate-300' },
          { l: 'Total Trades', v: trades.length, c: 'text-slate-400' },
        ].map((x) => (
          <div key={x.l} className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-xs text-slate-400">{x.l}</div>
            <div className={`text-2xl font-bold mt-1 ${x.c}`}>{x.v}</div>
          </div>
        ))}
      </div>

      <details className="bg-champagne-400/15 border border-champagne-400/25 rounded-xl">
        <summary className="px-4 py-3 cursor-pointer text-champagne-300 text-sm font-medium flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          How it works
        </summary>
        <div className="px-4 pb-4 text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-cream mt-2">The handoff:</p>
          <p>
            Cron keeps idle pairs alive in the background. When you start a session, the session inherits
            the live pair price and takes over from that exact point. When you stop or complete the session,
            cron continues later from wherever the session stopped.
          </p>

          <p className="font-semibold text-cream mt-3">Two ways to move price:</p>
          <p>
            <b>Option A — Sessions:</b> choose pair, direction, target, and duration. Session starts from
            the live pair state, not a reset.
          </p>
          <p>
            <b>Option B — Manual override:</b> type a new bid/ask and save. Trades reprice immediately.
          </p>

          <p className="font-semibold text-cream mt-3">Important:</p>
          <p>
            Auto-Tick on this page now drives only active sessions. Idle/background movement is left to cron.
          </p>
        </div>
      </details>

      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="fixed inset-0 bg-void/80 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-obsidian border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-cream">New Session</h3>
                  <button onClick={() => setShowCreate(false)}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Pair</label>
                  <select
                    value={cPairId}
                    onChange={(e) => setCPairId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm"
                  >
                    <option value="">Select…</option>
                    {pairs
                      .filter((p: any) => p.is_active)
                      .map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.symbol}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Type</label>
                    <select
                      value={cType}
                      onChange={(e) => setCType(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm"
                    >
                      {SESSION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t} {t === 'bullish' || t === 'spike' ? '↑ BUY' : t === 'bearish' || t === 'crash' ? '↓ SELL' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Duration</label>
                    <select
                      value={cDur}
                      onChange={(e) => setCDur(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm"
                    >
                      {DURATIONS.map((d) => (
                        <option key={d.ms} value={d.ms}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cUseLiveStart}
                    onChange={(e) => setCUseLiveStart(e.target.checked)}
                    className="rounded border-white/20 accent-electric"
                  />
                  <div>
                    <span className="text-sm text-cream font-medium">
                      Use live current price as session start
                    </span>
                    <p className="text-xs text-slate-500">
                      Recommended. Session inherits whatever price cron/autopilot reached.
                    </p>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Start Bid</label>
                    <input
                      value={cSB}
                      onChange={(e) => setCSB(e.target.value)}
                      readOnly={cUseLiveStart}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm font-mono"
                      placeholder="8.50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Start Ask</label>
                    <input
                      value={cSA}
                      onChange={(e) => setCSA(e.target.value)}
                      readOnly={cUseLiveStart}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm font-mono"
                      placeholder="8.502"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Target Bid</label>
                    <input
                      value={cTB}
                      onChange={(e) => setCTB(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm font-mono"
                      placeholder="8.60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Target Ask</label>
                    <input
                      value={cTA}
                      onChange={(e) => setCTA(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm font-mono"
                      placeholder="8.602"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Volatility</label>
                  <input
                    value={cVol}
                    onChange={(e) => setCVol(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm font-mono"
                    placeholder="0.0008"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Instructions for users
                  </label>
                  <textarea
                    value={cInstr}
                    onChange={(e) => setCInstr(e.target.value)}
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm"
                    placeholder="e.g. Hold for 3 minutes then close"
                  />
                </div>

                <label className="flex items-center gap-3 p-3 bg-electric/5 border border-electric/20 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cAutoTg}
                    onChange={(e) => setCAutoTg(e.target.checked)}
                    className="rounded border-white/20 accent-electric"
                  />
                  <div>
                    <span className="text-sm text-cream font-medium">
                      Send signal to Telegram automatically
                    </span>
                    <p className="text-xs text-slate-500">
                      Will send "
                      {directionFromSession(cType, Number(cSB) || 0, Number(cTB) || 0)}{' '}
                      {pairs.find((p: any) => p.id === cPairId)?.symbol || '...'}"
                    </p>
                  </div>
                  <Send className="w-4 h-4 text-electric ml-auto" />
                </label>

                <button
                  onClick={handleCreate}
                  disabled={creating || !cPairId}
                  className="w-full py-3 bg-loss text-white font-semibold rounded-xl hover:bg-loss/80 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Create & Start {cAutoTg ? '+ Send Signal' : ''}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTgPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTgPanel(false)}
              className="fixed inset-0 bg-void/80 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-obsidian border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-cream flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-electric" />
                    Review Signal
                  </h3>
                  <button onClick={() => setShowTgPanel(false)}>
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <p className="text-xs text-slate-400">
                  This was auto-generated from your action. Edit if needed, then send.
                </p>

                <textarea
                  value={tgMessage}
                  onChange={(e) => setTgMessage(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream text-sm focus:outline-none focus:border-electric/50 font-mono"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tgMessage);
                      setMsg({ type: 'success', text: 'Copied!' });
                    }}
                    className="flex-1 py-3 bg-white/5 text-slate-300 rounded-xl hover:bg-white/10 flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>

                  <button
                    onClick={sendTgManual}
                    disabled={tgSending}
                    className="flex-[2] py-3 bg-electric text-void font-semibold rounded-xl hover:bg-electric/80 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {tgSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send to Telegram
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSignal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!sigResult) setShowSignal(false);
              }}
              className="fixed inset-0 bg-void/80 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-obsidian border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                {!sigResult ? (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-cream flex items-center gap-2">
                        <Send className="w-5 h-5 text-champagne-300" />
                        Send Signal
                      </h3>
                      <button onClick={() => setShowSignal(false)}>
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-400">
                      Pick a pair, direction, profit target, and duration.
                    </p>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Pair</label>
                      <select
                        value={sigPairId}
                        onChange={(e) => setSigPairId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-cream text-sm"
                      >
                        <option value="">Select pair…</option>
                        {pairs
                          .filter((p: any) => p.is_active)
                          .map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.symbol} — {fmt(p.current_bid, 4)}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSigDir('buy')}
                        className={`py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                          sigDir === 'buy'
                            ? 'bg-profit text-void shadow-lg shadow-profit/20'
                            : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        📈 BUY
                      </button>

                      <button
                        onClick={() => setSigDir('sell')}
                        className={`py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                          sigDir === 'sell'
                            ? 'bg-loss text-white shadow-lg shadow-loss/20'
                            : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        📉 SELL
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Profit %</label>
                        <div className="flex gap-1 flex-wrap">
                          {['10', '15', '25', '50'].map((v) => (
                            <button
                              key={v}
                              onClick={() => setSigProfit(v)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                sigProfit === v ? 'bg-champagne-400 text-void' : 'bg-white/5 text-slate-300'
                              }`}
                            >
                              +{v}%
                            </button>
                          ))}
                        </div>
                        <input
                          value={sigProfit}
                          onChange={(e) => setSigProfit(e.target.value)}
                          className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm font-mono"
                          placeholder="15"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Duration (min)</label>
                        <div className="flex gap-1 flex-wrap">
                          {['2', '3', '5', '10'].map((v) => (
                            <button
                              key={v}
                              onClick={() => setSigDuration(v)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                sigDuration === v ? 'bg-electric text-void' : 'bg-white/5 text-slate-300'
                              }`}
                            >
                              {v}m
                            </button>
                          ))}
                        </div>
                        <input
                          value={sigDuration}
                          onChange={(e) => setSigDuration(e.target.value)}
                          className="w-full mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm font-mono"
                          placeholder="5"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Entry time</label>
                      <input
                        value={sigTime}
                        onChange={(e) => setSigTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-sm font-mono"
                        placeholder="10:15"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        Defaults to NOW + 1 minute.
                      </p>
                    </div>

                    <button
                      onClick={createSignal}
                      disabled={sigCreating || !sigPairId}
                      className="w-full py-3.5 bg-gradient-to-r from-sapphire-400 to-orange-500 text-void font-bold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg text-sm"
                    >
                      {sigCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {sigCreating ? 'Creating signal…' : `Send ${sigDir.toUpperCase()} Signal + Telegram`}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-profit/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="w-8 h-8 text-profit" />
                      </div>
                      <h3 className="text-lg font-bold text-cream">Signal Live!</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {sigResult.pair} — {sigResult.direction.toUpperCase()} +{sigResult.profit_percent}%
                      </p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Entry price</span>
                        <span className="text-cream font-mono">{sigResult.entry_price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target price</span>
                        <span className="text-profit font-mono">{sigResult.target_price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Entry time</span>
                        <span className="text-cream">{sigResult.entry_time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Duration</span>
                        <span className="text-cream">{sigResult.duration_minutes}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Telegram</span>
                        <span className={sigResult.telegram_sent ? 'text-profit' : 'text-champagne-300'}>
                          {sigResult.telegram_sent ? '✅ Sent' : '⚠️ Not configured'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-champagne-400/15 border border-champagne-400/25 rounded-xl p-3 text-xs text-champagne-300">
                      💡 Auto-Tick is now ON. Price will move toward target over {sigResult.duration_minutes} minutes.
                    </div>

                    <button
                      onClick={() => setShowSignal(false)}
                      className="w-full py-3 bg-white/10 text-cream rounded-xl hover:bg-white/15 text-sm"
                    >
                      Done
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-2 border-loss border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {pairs.map((pair: any) => {
            const pt = tradesByPair[pair.id] || [];
            const pairSessions = (sessByPair[pair.id] || []).filter((s: any) =>
              ['running', 'paused', 'pending'].includes(s.status)
            );

            const visibleSessions = [...pairSessions].sort((a: any, b: any) => {
              const order: Record<string, number> = { running: 0, paused: 1, pending: 2 };
              return (order[a.status] ?? 9) - (order[b.status] ?? 9);
            });

            const active = visibleSessions.find((s: any) => s.status === 'running') || null;

            const ghostSession =
              !active &&
              visibleSessions.length === 0 &&
              !!pair.active_session_id
                ? {
                    id: pair.active_session_id,
                    status: 'running',
                    tick_seq: 0,
                    session_type: 'session',
                    isGhost: true,
                  }
                : null;

            const brokenSessionMode =
              !active &&
              visibleSessions.length === 0 &&
              !pair.active_session_id &&
              pair.mode === 'session';

            const controlSession = active || visibleSessions[0] || ghostSession || null;
            const hasControllableSession = !!controlSession || brokenSessionMode;

            const exp = expandedPairs.has(pair.id);
            const isEdit = editId === pair.id;
            const dp =
              pair.pip_size === 0.01
                ? 2
                : pair.pip_size === 0.001
                ? 3
                : pair.pip_size === 0.00001
                ? 5
                : 4;

            return (
              <div
                key={pair.id}
                className={`rounded-2xl border overflow-hidden ${
                  pair.is_active ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-60'
                }`}
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-11 h-11 bg-gradient-to-br from-electric/20 to-loss/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Activity className="w-5 h-5 text-cream" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-cream">{pair.symbol}</span>

                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            active
                              ? 'bg-profit/20 text-profit animate-pulse'
                              : controlSession || brokenSessionMode
                              ? 'bg-champagne-400/15 text-champagne-300'
                              : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {active
                            ? `${active.session_type} session`
                            : controlSession
                            ? `${controlSession.session_type} ${controlSession.status}`
                            : brokenSessionMode
                            ? 'session (stuck)'
                            : pair.mode}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500">
                        {pair.name} · seq {pair.seq || 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isEdit ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          value={editBid}
                          onChange={(e) => setEditBid(e.target.value)}
                          className="w-24 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-cream text-sm font-mono"
                          placeholder="Bid"
                        />
                        <input
                          value={editAsk}
                          onChange={(e) => setEditAsk(e.target.value)}
                          className="w-24 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-cream text-sm font-mono"
                          placeholder="Ask"
                        />
                        <label
                          className="flex items-center gap-1 text-xs text-electric cursor-pointer"
                          title="Auto-send signal to Telegram"
                        >
                          <input
                            type="checkbox"
                            checked={editAutoTg}
                            onChange={(e) => setEditAutoTg(e.target.checked)}
                            className="rounded border-white/20 accent-electric w-3 h-3"
                          />
                          <Send className="w-3 h-3" />
                        </label>
                        <button
                          onClick={saveOverride}
                          className="p-1.5 bg-profit/20 text-profit rounded-lg"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="p-1.5 bg-white/5 text-slate-400 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-center">
                          <div className="text-[10px] text-slate-500">Bid</div>
                          <div className="text-sm font-mono font-bold text-loss">
                            {fmt(pair.current_bid, dp)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[10px] text-slate-500">Ask</div>
                          <div className="text-sm font-mono font-bold text-profit">
                            {fmt(pair.current_ask, dp)}
                          </div>
                        </div>

                        {!hasControllableSession && (
                          <button
                            onClick={() => {
                              setEditId(pair.id);
                              setEditBid(String(pair.current_bid));
                              setEditAsk(String(pair.current_ask));
                              setEditAutoTg(true);
                            }}
                            className="p-1.5 bg-white/5 text-slate-400 rounded-lg hover:text-cream"
                            title="Override price"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {controlSession ? (
                      <>
                        <div className="text-xs px-2 py-1 bg-white/5 text-slate-300 rounded-lg">
                          #{controlSession.tick_seq || 0}
                        </div>

                        {controlSession.status === 'pending' && (
                          <button
                            onClick={() => ctrlSess(controlSession.id, 'start')}
                            className="p-1.5 bg-profit/20 text-profit rounded-lg hover:bg-profit/30"
                            title="Start session"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        )}

                        {controlSession.status === 'running' && !controlSession.isGhost && (
                          <button
                            onClick={() => ctrlSess(controlSession.id, 'pause')}
                            className="p-1.5 bg-champagne-400/15 text-champagne-300 rounded-lg hover:bg-champagne-400/15"
                            title="Pause session"
                          >
                            <Pause className="w-3 h-3" />
                          </button>
                        )}

                        {controlSession.status === 'paused' && (
                          <button
                            onClick={() => ctrlSess(controlSession.id, 'resume')}
                            className="p-1.5 bg-electric/20 text-electric rounded-lg hover:bg-electric/30"
                            title="Resume session"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        )}

                        <button
                          onClick={() => ctrlSess(controlSession.id, 'stop')}
                          className="p-1.5 bg-loss/20 text-loss rounded-lg hover:bg-loss/30"
                          title="Stop session"
                        >
                          <Square className="w-3 h-3" />
                        </button>
                      </>
                    ) : brokenSessionMode ? (
                      <button
                        onClick={() => forceStopPair(pair.id)}
                        className="p-1.5 bg-loss/20 text-loss rounded-lg hover:bg-loss/30"
                        title="Force stop stuck session mode"
                      >
                        <Square className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => prefill(pair)}
                        className="p-1.5 bg-profit/20 text-profit rounded-lg hover:bg-profit/30"
                        title="New session"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}

                    <span className="text-xs px-2 py-1 bg-white/5 text-slate-400 rounded-lg">
                      {pt.filter((t: any) => t.status === 'open').length} open
                    </span>

                    <button
                      onClick={() =>
                        setExpandedPairs((prev) => {
                          const n = new Set(prev);
                          n.has(pair.id) ? n.delete(pair.id) : n.add(pair.id);
                          return n;
                        })
                      }
                      className="p-1.5 bg-white/5 text-slate-400 rounded-lg hover:text-cream"
                    >
                      {exp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {exp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/10 overflow-hidden"
                    >
                      <div className="p-4 space-y-4">
                        {visibleSessions.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs text-slate-400">Session controls</div>

                            {visibleSessions.map((s: any) => {
                              const liveElapsed =
                                Number(s.elapsed_ms || 0) +
                                (s.status === 'running' && s.started_at
                                  ? Math.max(0, Date.now() - new Date(s.started_at).getTime())
                                  : 0);

                              const progress =
                                Number(s.duration_ms || 0) > 0
                                  ? Math.min(100, Math.round((liveElapsed / Number(s.duration_ms)) * 100))
                                  : 0;

                              return (
                                <div
                                  key={s.id}
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-semibold text-cream">
                                        {s.session_type}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300">
                                        {s.status}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {progress}%
                                      </span>
                                      <span>tick #{s.tick_seq || 0}</span>
                                      <span>{Math.round(Number(s.duration_ms || 0) / 60000)}m</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    {s.status === 'pending' && (
                                      <button
                                        onClick={() => ctrlSess(s.id, 'start')}
                                        className="px-3 py-1.5 bg-profit/20 text-profit rounded-lg text-xs font-medium hover:bg-profit/30 flex items-center gap-1"
                                      >
                                        <Play className="w-3 h-3" />
                                        Start
                                      </button>
                                    )}

                                    {s.status === 'running' && (
                                      <button
                                        onClick={() => ctrlSess(s.id, 'pause')}
                                        className="px-3 py-1.5 bg-champagne-400/15 text-champagne-300 rounded-lg text-xs font-medium hover:bg-champagne-400/15 flex items-center gap-1"
                                      >
                                        <Pause className="w-3 h-3" />
                                        Pause
                                      </button>
                                    )}

                                    {s.status === 'paused' && (
                                      <button
                                        onClick={() => ctrlSess(s.id, 'resume')}
                                        className="px-3 py-1.5 bg-electric/20 text-electric rounded-lg text-xs font-medium hover:bg-electric/30 flex items-center gap-1"
                                      >
                                        <Play className="w-3 h-3" />
                                        Resume
                                      </button>
                                    )}

                                    <button
                                      onClick={() => ctrlSess(s.id, 'stop')}
                                      className="px-3 py-1.5 bg-loss/20 text-loss rounded-lg text-xs font-medium hover:bg-loss/30 flex items-center gap-1"
                                    >
                                      <Square className="w-3 h-3" />
                                      Stop
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {brokenSessionMode && (
                          <div className="p-3 rounded-xl bg-loss/10 border border-loss/20 flex items-center justify-between gap-3">
                            <div className="text-xs text-loss">
                              Pair is stuck in session mode with no active session row.
                            </div>
                            <button
                              onClick={() => forceStopPair(pair.id)}
                              className="px-3 py-1.5 bg-loss/20 text-loss rounded-lg text-xs font-medium hover:bg-loss/30 flex items-center gap-1"
                            >
                              <Square className="w-3 h-3" />
                              Force Stop
                            </button>
                          </div>
                        )}

                        {pt.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-4">
                            No trades on this pair yet.
                          </p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-xs text-slate-500 border-b border-white/10">
                                  <th className="text-left px-3 py-2">User</th>
                                  <th className="text-left px-3 py-2">Side</th>
                                  <th className="text-right px-3 py-2">Margin</th>
                                  <th className="text-right px-3 py-2">Entry</th>
                                  <th className="text-right px-3 py-2">Current</th>
                                  <th className="text-right px-3 py-2">PnL</th>
                                  <th className="text-center px-3 py-2">Status</th>
                                  <th className="text-right px-3 py-2">Act</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pt
                                  .sort(
                                    (a: any, b: any) =>
                                      (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1)
                                  )
                                  .map((t: any) => {
                                    const u = t.users;
                                    const pnl =
                                      t.status === 'open'
                                        ? t.floating_pnl
                                        : t.final_pnl ?? t.floating_pnl;

                                    return (
                                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                        <td className="px-3 py-2 text-xs text-cream">
                                          {u?.email || t.user_id?.slice(0, 8)}
                                        </td>
                                        <td className="px-3 py-2">
                                          <span
                                            className={`text-xs px-2 py-0.5 rounded ${
                                              Number(t.direction) === 1
                                                ? 'bg-profit/10 text-profit'
                                                : 'bg-loss/10 text-loss'
                                            }`}
                                          >
                                            {t.direction_label}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs font-mono">
                                          ${fmt(t.investment, 2)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs font-mono">
                                          {fmt(t.entry_price, dp)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-xs font-mono">
                                          {fmt(t.current_price, dp)}
                                        </td>
                                        <td
                                          className={`px-3 py-2 text-right text-xs font-mono font-semibold ${
                                            Number(pnl) >= 0 ? 'text-profit' : 'text-loss'
                                          }`}
                                        >
                                          {Number(pnl) >= 0 ? '+' : ''}${fmt(pnl, 2)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <span
                                            className={`text-[10px] px-2 py-0.5 rounded ${
                                              t.status === 'open'
                                                ? 'bg-profit/10 text-profit'
                                                : 'bg-white/10 text-slate-400'
                                            }`}
                                          >
                                            {t.status}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                          {t.status === 'open' && (
                                            <button
                                              onClick={() => adminClose(t.id)}
                                              className="text-loss text-[10px] hover:underline"
                                            >
                                              Close
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}