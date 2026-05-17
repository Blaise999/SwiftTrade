'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, User, Bell, Shield, MessageCircle, Save, CheckCircle,
  AlertCircle, X, RefreshCw, Send, ExternalLink,
} from 'lucide-react';
import { useAdminAuthStore } from '@/lib/admin-store';

function getStorageToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem('swifttrade_admin_token') || window.localStorage.getItem('swifttrade_admin_token') || null;
}
function getAdminToken(a: any, st?: string | null): string | null {
  if (st) return st;
  return a?.sessionToken || a?.session_token || a?.token || a?.access_token || getStorageToken();
}

export default function AdminSettingsPage() {
  const store: any = useAdminAuthStore();
  const admin = store?.admin ?? null;
  const token = useMemo(() => getAdminToken(admin, store?.sessionToken ?? store?.token ?? null), [admin, store]);

  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Telegram config
  const [tgToken, setTgToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgConfigured, setTgConfigured] = useState(false);
  const [tgMasked, setTgMasked] = useState('');
  const [tgSaving, setTgSaving] = useState(false);
  const [tgTestMsg, setTgTestMsg] = useState('🚀 *SwiftTrade Bot Test*\n\nIf you see this, your Telegram bot is working!');
  const [tgSending, setTgSending] = useState(false);

  const apiFetch = useCallback(async (path: string, init?: RequestInit) => {
    if (!token) throw new Error('Missing admin token');
    const h: Record<string, string> = { Authorization: `Bearer ${token}`, ...(init?.headers as any) };
    if (init?.body && !h['Content-Type']) h['Content-Type'] = 'application/json';
    const r = await fetch(path, { ...init, headers: h, cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error || `Failed (${r.status})`);
    return j;
  }, [token]);

  // Load telegram config on mount
  useEffect(() => {
    if (!token) return;
    apiFetch('/api/admin/telegram')
      .then((res) => {
        if (res.config) {
          setTgConfigured(res.config.has_token);
          setTgMasked(res.config.bot_token_masked || '');
          setTgChatId(res.config.chat_id || '');
        }
      })
      .catch(() => {});
  }, [token, apiFetch]);

  const saveTelegramConfig = async () => {
    if (!tgToken.trim() || !tgChatId.trim()) {
      setMsg({ type: 'error', text: 'Bot token and Chat ID are both required' });
      return;
    }
    setTgSaving(true);
    try {
      await apiFetch('/api/admin/telegram', {
        method: 'POST',
        body: JSON.stringify({ action: 'save_config', bot_token: tgToken.trim(), chat_id: tgChatId.trim() }),
      });
      setMsg({ type: 'success', text: 'Telegram bot connected successfully!' });
      setTgConfigured(true);
      setTgMasked(tgToken.slice(0, 6) + '...' + tgToken.slice(-4));
      setTgToken(''); // Clear sensitive field
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setTgSaving(false);
    }
  };

  const sendTestMessage = async () => {
    if (!tgTestMsg.trim()) return;
    setTgSending(true);
    try {
      await apiFetch('/api/admin/telegram', {
        method: 'POST',
        body: JSON.stringify({ action: 'send', message: tgTestMsg.trim() }),
      });
      setMsg({ type: 'success', text: 'Message sent to Telegram!' });
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setTgSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-cream">Settings</h1>
        <p className="text-slate-400 mt-1">Admin preferences & integrations</p>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`p-3 rounded-xl flex items-center gap-2 text-sm ${msg.type === 'success' ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}
          >
            {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {msg.text}
            <button onClick={() => setMsg(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile */}
      <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-gold" />
          <h2 className="text-lg font-semibold text-cream">Profile</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Admin Name</label>
            <input type="text" value={admin?.name || ''} disabled className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
            <input type="email" value={admin?.email || ''} disabled className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Role</label>
            <input type="text" value={admin?.role || ''} disabled className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream opacity-60 cursor-not-allowed capitalize" />
          </div>
        </div>
      </div>

      {/* Telegram Bot Integration */}
      <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-2">
          <MessageCircle className="w-5 h-5 text-electric" />
          <h2 className="text-lg font-semibold text-cream">Telegram Bot</h2>
          {tgConfigured && <span className="text-xs px-2 py-0.5 bg-profit/20 text-profit rounded-full">Connected</span>}
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Send trade signals & announcements to your Telegram group automatically.
        </p>

        {/* Setup instructions */}
        <details className="mb-5 bg-electric/5 border border-electric/20 rounded-xl">
          <summary className="px-4 py-3 cursor-pointer text-electric text-sm font-medium">How to set up your Telegram bot</summary>
          <div className="px-4 pb-4 text-xs text-slate-300 space-y-2">
            <p>1. Open Telegram, search for <b>@BotFather</b></p>
            <p>2. Send <code>/newbot</code> → follow prompts → get your <b>Bot Token</b></p>
            <p>3. Create a Telegram group/channel for your signals</p>
            <p>4. Add your bot to that group as admin</p>
            <p>5. To get the <b>Chat ID</b>: add <code>@RawDataBot</code> to the group, it will print the chat ID (usually starts with <code>-100...</code>)</p>
            <p>6. Paste both values below and click Save</p>
          </div>
        </details>

        <div className="space-y-4">
          {tgConfigured && (
            <div className="p-3 bg-profit/5 border border-profit/20 rounded-xl">
              <p className="text-xs text-slate-400">Current bot token</p>
              <p className="text-sm text-cream font-mono">{tgMasked}</p>
              <p className="text-xs text-slate-400 mt-1">Chat ID: <span className="text-cream">{tgChatId || '—'}</span></p>
              <p className="text-xs text-slate-500 mt-2">Enter a new token below to replace it.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Bot Token (from @BotFather)</label>
            <input
              type="password"
              value={tgToken}
              onChange={(e) => setTgToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxyz..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-slate-600 focus:outline-none focus:border-electric/50 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Chat ID (group or channel)</label>
            <input
              type="text"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              placeholder="-1001234567890"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-slate-600 focus:outline-none focus:border-electric/50 font-mono text-sm"
            />
          </div>

          <button
            onClick={saveTelegramConfig}
            disabled={tgSaving || !tgToken.trim() || !tgChatId.trim()}
            className="w-full py-3 bg-electric text-void font-semibold rounded-xl hover:bg-electric/80 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {tgSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {tgConfigured ? 'Update Bot Config' : 'Connect Bot'}
          </button>
        </div>

        {/* Test Send */}
        {tgConfigured && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <h3 className="text-sm font-medium text-cream mb-3">Test Message</h3>
            <textarea
              value={tgTestMsg}
              onChange={(e) => setTgTestMsg(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream text-sm focus:outline-none focus:border-electric/50 font-mono"
            />
            <p className="text-xs text-slate-500 mt-1 mb-3">Supports Markdown: *bold*, _italic_, `code`</p>
            <button
              onClick={sendTestMessage}
              disabled={tgSending || !tgTestMsg.trim()}
              className="w-full py-3 bg-profit text-void font-semibold rounded-xl hover:bg-profit/80 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {tgSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Test to Telegram
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-gold" />
          <h2 className="text-lg font-semibold text-cream">Notifications</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Session reminders', description: 'Get notified before sessions start', enabled: true },
            { label: 'Signal alerts', description: 'Real-time signal notifications', enabled: true },
            { label: 'System updates', description: 'Important platform updates', enabled: false },
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <p className="text-sm font-medium text-cream">{item.label}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
              </div>
              <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-all ${item.enabled ? 'bg-profit' : 'bg-white/10'}`}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${item.enabled ? 'left-5' : 'left-1'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-loss" />
          <h2 className="text-lg font-semibold text-cream">Security</h2>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-white/5 rounded-xl">
            <p className="text-sm text-cream font-medium">Session Info</p>
            <p className="text-xs text-slate-500 mt-1">Sessions auto-expire after 8 hours of inactivity.</p>
            <p className="text-xs text-slate-500">Your admin token is stored securely in browser sessionStorage.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
