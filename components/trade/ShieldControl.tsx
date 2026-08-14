'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, Lock, Zap, ChevronDown, X } from 'lucide-react';

type Kind = 'crypto' | 'stock';

/**
 * ShieldControl — a deliberately theatrical Shield toggle for the asset detail
 * pages. Activating runs a short "engaging shield" sequence; the protected
 * state has a live glowing aura + scanning ring. Includes Auto-Shield config.
 */
export function ShieldControl({
  userId, symbol, kind, price, name, positionValue = 0,
  initialShielded = false, initialAuto = false, initialFloor = '', initialCeiling = '',
  onChange,
}: {
  userId?: string; symbol: string; kind: Kind; price: number; name?: string; positionValue?: number;
  initialShielded?: boolean; initialAuto?: boolean; initialFloor?: string; initialCeiling?: string;
  onChange?: (shielded: boolean) => void;
}) {
  const [shielded, setShielded] = useState(initialShielded);
  const [phase, setPhase] = useState<'idle' | 'engaging' | 'done'>('idle');
  const [engText, setEngText] = useState('');
  const [showAuto, setShowAuto] = useState(false);
  const [auto, setAuto] = useState(initialAuto);
  const [floor, setFloor] = useState(initialFloor);
  const [ceiling, setCeiling] = useState(initialCeiling);
  const [lockedAt, setLockedAt] = useState<number | null>(initialShielded ? price : null);
  const SHIELD_FEE_PCT = 0.01;
  const fee = Math.max(0, positionValue * SHIELD_FEE_PCT);
  const [feeErr, setFeeErr] = useState('');

  useEffect(() => { setShielded(initialShielded); setLockedAt(initialShielded ? price : null); }, [initialShielded]);

  const activate = async () => {
    if (phase === 'engaging') return;
    const next = !shielded;
    if (next) {
      // theatrical engage sequence
      setPhase('engaging');
      const steps = ['Engaging shield…', 'Diverting to stable store…', 'Locking value…'];
      for (let i = 0; i < steps.length; i++) { setEngText(steps[i]); await wait(460); }
      setLockedAt(price);
      setShielded(true);
      setPhase('done');
      await wait(700);
      setPhase('idle');
    } else {
      setShielded(false);
      setLockedAt(null);
    }
    onChange?.(next);
    fetch('/api/positions/shield-toggle', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, symbol, kind, enabled: next, positionValue }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok && j?.code === 'INSUFFICIENT_FOR_FEE') {
          setFeeErr(j.error); setShielded(false); setLockedAt(null); onChange?.(false);
        }
      })
      .catch(() => {});
  };

  const saveAuto = async (enabled: boolean) => {
    setAuto(enabled); setShowAuto(false);
    fetch('/api/positions/shield-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, symbol, kind, enabled, floor, ceiling }),
    }).catch(() => {});
  };

  return (
    <div className={`relative overflow-hidden rounded-3xl border p-5 transition-colors duration-500 ${
      shielded ? 'border-[var(--accent)]/40 bg-[var(--accent)]/[0.06]' : 'border-[var(--border)] bg-[var(--card)]'
    }`}>
      {/* animated aura when shielded */}
      <AnimatePresence>
        {shielded && (
          <>
            <motion.div
              key="aura"
              className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[70px] bg-[var(--accent)]/25"
              initial={{ opacity: 0 }} animate={{ opacity: [0.3, 0.6, 0.3] }} exit={{ opacity: 0 }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div
              key="ring"
              className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full border border-[var(--accent)]/30"
              initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: [0.8, 1.25], opacity: [0.5, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
            />
          </>
        )}
      </AnimatePresence>

      <div className="relative flex items-center gap-4">
        {/* shield emblem */}
        <div className="relative shrink-0">
          <motion.div
            animate={shielded ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 2, repeat: shielded ? Infinity : 0 }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              shielded ? 'bg-[var(--accent)] text-[#04140A] glow-up' : 'bg-[var(--inset)] text-[var(--text-3)]'
            }`}
          >
            {shielded ? <ShieldCheck className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
          </motion.div>
          {phase === 'engaging' && (
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-[var(--accent)]"
              animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
              transition={{ duration: 0.7, repeat: Infinity }}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-[var(--text)] flex items-center gap-2">
            Shield mode
            {shielded && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent)]/15 text-[var(--accent)]">Protected</span>}
          </div>
          <div className="text-[12px] text-[var(--text-3)] mt-0.5 h-4">
            <AnimatePresence mode="wait">
              <motion.span
                key={phase === 'engaging' ? engText : shielded ? 'on' : 'off'}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              >
                {phase === 'engaging' ? engText
                  : shielded
                    ? <>Value locked at <span className="text-[var(--text)] font-medium tabular-nums">${(lockedAt ?? price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span> · immune to the market</>
                    : `Lock ${symbol}'s value — move it to a stable store`}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* fee notice */}
      {!shielded && fee > 0 && (
        <div className="mt-3 text-[11.5px] text-[var(--text-3)] text-center">
          Shield premium: <span className="text-[var(--text)] font-medium">${fee.toFixed(2)}</span> (1% of ${positionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })})
        </div>
      )}
      {feeErr && <div className="mt-2 text-[12px] text-[#FF4D3D] text-center">{feeErr}</div>}

      {/* activate / deactivate */}
      <button
        onClick={activate}
        disabled={phase === 'engaging'}
        className={`relative mt-4 w-full py-3.5 rounded-2xl font-bold overflow-hidden transition disabled:opacity-70 ${
          shielded ? 'bg-[var(--inset)] text-[var(--text)] border border-[var(--border)]' : 'bg-[var(--accent)] text-[#04140A] glow-up'
        }`}
      >
        {/* sweep light while engaging */}
        {phase === 'engaging' && (
          <motion.span
            className="absolute inset-y-0 w-1/3 bg-white/25 blur-md"
            initial={{ left: '-40%' }} animate={{ left: '120%' }}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
          />
        )}
        <span className="relative inline-flex items-center justify-center gap-2">
          {phase === 'engaging' ? <><Zap className="w-4 h-4" /> Engaging…</>
            : shielded ? <><Lock className="w-4 h-4" /> Deactivate Shield</>
            : <><Shield className="w-4 h-4" /> Activate Shield</>}
        </span>
      </button>

      {/* auto-shield */}
      <button onClick={() => setShowAuto(v => !v)}
        className="mt-3 w-full flex items-center justify-between text-[12px] text-[var(--text-2)]">
        <span className="inline-flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[var(--accent-2)]" />
          Auto-Shield {auto && <span className="text-[var(--accent)]">· on</span>}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showAuto ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {showAuto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-2.5">
              <p className="text-[11px] text-[var(--text-3)]">Shields when the price drops to your floor, un-shields when it recovers to your ceiling.</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] text-[var(--text-3)]">Floor (shield)
                  <div className="mt-1 flex items-center rounded-lg bg-[var(--inset)] border border-[var(--border)] px-2">
                    <span className="text-[var(--text-3)]">$</span>
                    <input value={floor} onChange={e => setFloor(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal"
                      className="w-full bg-transparent outline-none px-1.5 py-2 text-[13px] text-[var(--text)] tabular-nums" />
                  </div>
                </label>
                <label className="text-[11px] text-[var(--text-3)]">Ceiling (release)
                  <div className="mt-1 flex items-center rounded-lg bg-[var(--inset)] border border-[var(--border)] px-2">
                    <span className="text-[var(--text-3)]">$</span>
                    <input value={ceiling} onChange={e => setCeiling(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal"
                      className="w-full bg-transparent outline-none px-1.5 py-2 text-[13px] text-[var(--text)] tabular-nums" />
                  </div>
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={() => saveAuto(true)} className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-[#04140A] text-[13px] font-bold">Enable Auto-Shield</button>
                {auto && <button onClick={() => saveAuto(false)} className="px-3 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-2)] text-[13px]"><X className="w-4 h-4" /></button>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default ShieldControl;
