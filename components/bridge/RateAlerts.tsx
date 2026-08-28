'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Plus, X, TrendingUp, TrendingDown } from 'lucide-react';

const CURRENCIES = ['NGN', 'HKD', 'PHP', 'INR', 'GHS', 'KES', 'ZAR', 'GBP', 'EUR', 'JPY', 'SGD', 'MXN', 'BRL', 'TRY'];

export function RateAlerts({ userId }: { userId?: string }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState('NGN');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!userId) return;
    fetch(`/api/bridge/alerts?userId=${userId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { setAlerts(j?.alerts || []); setRates(j?.rates || {}); })
      .catch(() => {});
  };
  useEffect(load, [userId]);

  const create = async () => {
    if (!userId || !target) return;
    setBusy(true);
    try {
      await fetch('/api/bridge/alerts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, quote, direction, target: Number(target) }),
      });
      setTarget(''); setOpen(false); load();
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!userId) return;
    await fetch(`/api/bridge/alerts?id=${id}&userId=${userId}`, { method: 'DELETE' });
    load();
  };

  const current = rates[quote];

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-obsidian to-charcoal p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold text-cream flex items-center gap-2">
          <Bell className="w-4 h-4 text-electric" /> Rate alerts
        </h3>
        <button onClick={() => setOpen(!open)}
          className="text-[11px] font-semibold text-electric hover:opacity-80 inline-flex items-center gap-1">
          {open ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {open ? 'Close' : 'New alert'}
        </button>
      </div>
      <p className="text-[11.5px] text-cream/50 mb-4">
        We&apos;ll notify and email you the moment a corridor hits your number.
      </p>

      {open && (
        <div className="mb-4 rounded-xl bg-white/5 border border-white/10 p-3.5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-cream/50">Currency</label>
              <select value={quote} onChange={(e) => setQuote(e.target.value)}
                className="mt-1 w-full px-2.5 py-2 rounded-lg bg-charcoal border border-white/10 text-cream text-sm outline-none">
                {CURRENCIES.map((c) => <option key={c} value={c}>USD / {c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-cream/50">When rate is</label>
              <div className="mt-1 flex rounded-lg bg-charcoal border border-white/10 p-0.5">
                {(['above', 'below'] as const).map((d) => (
                  <button key={d} onClick={() => setDirection(d)}
                    className={`flex-1 py-1.5 rounded-md text-[12px] font-semibold transition ${
                      direction === d ? 'bg-electric text-void' : 'text-cream/60'
                    }`}>
                    {d === 'above' ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-cream/50">
              Target rate {current ? <span className="text-cream/40">· now {current.toFixed(2)}</span> : null}
            </label>
            <input value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder={current ? current.toFixed(2) : '0.00'} inputMode="decimal"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-charcoal border border-white/10 text-cream font-mono outline-none focus:border-electric/50" />
          </div>
          <button onClick={create} disabled={busy || !target}
            className="w-full py-2.5 rounded-lg bg-electric text-void font-bold text-[13px] disabled:opacity-40">
            {busy ? 'Saving…' : 'Create alert'}
          </button>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="text-center py-6 text-cream/40 text-[12.5px]">
          <BellOff className="w-5 h-5 mx-auto mb-2 opacity-50" />
          No alerts yet.
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const cur = Number(a.current);
            const pct = cur && a.target ? ((cur - Number(a.target)) / Number(a.target)) * 100 : 0;
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-cream">
                    USD / {a.quote}
                    <span className="text-cream/45 font-normal ml-2 text-[11.5px]">
                      {a.direction} {Number(a.target).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] text-cream/45 mt-0.5">
                    {a.triggered_at ? (
                      <span className="text-profit">Triggered</span>
                    ) : cur ? (
                      <>now {cur.toFixed(2)} · {Math.abs(pct).toFixed(1)}% {pct >= 0 ? 'above' : 'below'} target</>
                    ) : 'watching…'}
                  </div>
                </div>
                <button onClick={() => remove(a.id)} className="text-cream/35 hover:text-loss p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RateAlerts;
