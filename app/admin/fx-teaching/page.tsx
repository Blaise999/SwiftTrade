'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Play, Clock, Send, RefreshCw } from 'lucide-react';

type Step = {
  offset_seconds: number;
  mode: 'price' | 'move';
  target_bid?: string;
  target_ask?: string;
  direction?: 'up' | 'down';
  pips?: string;
  instruction?: string;
  telegram_message?: string;
};

const blankStep = (): Step => ({ offset_seconds: 0, mode: 'move', direction: 'up', pips: '10', telegram_message: '' });

export default function FxTeachingPage() {
  const [pairs, setPairs] = useState<any[]>([]);
  const [pairId, setPairId] = useState('');
  const [title, setTitle] = useState('EUR/USD live lesson');
  const [announce, setAnnounce] = useState(true);
  const [steps, setSteps] = useState<Step[]>([blankStep()]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const loadPairs = async () => {
    for (const url of ['/api/admin/demo-fx/pairs', '/api/demo-fx/pairs']) {
      try {
        const j = await (await fetch(url, { cache: 'no-store' })).json();
        const list = j?.pairs || j?.data || (Array.isArray(j) ? j : []);
        if (Array.isArray(list) && list.length) { setPairs(list); if (!pairId) setPairId(list[0].id); return; }
      } catch {}
    }
  };
  const loadLessons = async () => {
    try { const j = await (await fetch('/api/admin/fx-lessons', { cache: 'no-store' })).json(); setLessons(j?.lessons || []); } catch {}
  };
  useEffect(() => { loadPairs(); loadLessons(); /* eslint-disable-next-line */ }, []);

  const setStep = (i: number, patch: Partial<Step>) =>
    setSteps(prev => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  const start = async () => {
    setBusy(true); setMsg('');
    const pair = pairs.find(p => p.id === pairId);
    const payload = {
      pair_id: pairId || null,
      pair_symbol: pair?.symbol || pair?.pair || null,
      title, announce,
      steps: steps.map(s => ({
        offset_seconds: s.offset_seconds,
        target_bid: s.mode === 'price' ? s.target_bid : undefined,
        target_ask: s.mode === 'price' ? s.target_ask : undefined,
        direction: s.mode === 'move' ? s.direction : undefined,
        pips: s.mode === 'move' ? s.pips : undefined,
        instruction: s.instruction,
        telegram_message: s.telegram_message,
      })),
    };
    try {
      const j = await (await fetch('/api/admin/fx-lessons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })).json();
      setMsg(j?.ok ? 'Lesson started — steps will fire at their scheduled times.' : (j?.error || 'Failed'));
      if (j?.ok) { setSteps([blankStep()]); loadLessons(); }
    } catch (e: any) { setMsg(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  const runTick = async () => {
    setBusy(true);
    try { const j = await (await fetch('/api/demo-fx/lesson-tick', { method: 'POST' })).json(); setMsg(`Tick ran — ${j?.count ?? 0} step(s) applied.`); loadLessons(); }
    catch (e: any) { setMsg(e?.message || 'Tick failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text)]">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold">Teach FX — live lesson</h1>
        <p className="text-sm text-[var(--text-3)] mt-1">
          Each step fires at its time: it moves the demo price and posts your instruction to the Telegram group.
          Configure the bot first in <span className="text-[var(--text-2)]">Admin → Telegram</span>.
        </p>

        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="text-[var(--text-3)]">Lesson title</span>
              <input value={title} onChange={e => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg bg-[var(--inset)] border border-[var(--border)] px-3 py-2 outline-none" />
            </label>
            <label className="text-sm">
              <span className="text-[var(--text-3)]">Pair</span>
              <select value={pairId} onChange={e => setPairId(e.target.value)}
                className="mt-1 w-full rounded-lg bg-[var(--inset)] border border-[var(--border)] px-3 py-2 outline-none">
                {pairs.length === 0 && <option value="">No pairs loaded</option>}
                {pairs.map(p => <option key={p.id} value={p.id}>{p.symbol || p.pair || p.id}</option>)}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
            <input type="checkbox" checked={announce} onChange={e => setAnnounce(e.target.checked)} />
            Announce lesson start to the Telegram group
          </label>
        </div>

        <div className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Clock className="w-4 h-4 text-[var(--accent-2)]" /> Step {i + 1}</div>
                {steps.length > 1 && (
                  <button onClick={() => setSteps(prev => prev.filter((_, idx) => idx !== i))} className="text-[var(--text-3)] hover:text-[#FF4D3D]"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <label>
                  <span className="text-[var(--text-3)]">At second</span>
                  <input type="number" min={0} value={s.offset_seconds}
                    onChange={e => setStep(i, { offset_seconds: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg bg-[var(--inset)] border border-[var(--border)] px-3 py-2 outline-none" />
                </label>
                <label>
                  <span className="text-[var(--text-3)]">Price action</span>
                  <select value={s.mode} onChange={e => setStep(i, { mode: e.target.value as any })}
                    className="mt-1 w-full rounded-lg bg-[var(--inset)] border border-[var(--border)] px-3 py-2 outline-none">
                    <option value="move">Move by pips</option>
                    <option value="price">Set exact price</option>
                  </select>
                </label>
                {s.mode === 'move' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <label><span className="text-[var(--text-3)]">Dir</span>
                      <select value={s.direction} onChange={e => setStep(i, { direction: e.target.value as any })}
                        className="mt-1 w-full rounded-lg bg-[var(--inset)] border border-[var(--border)] px-2 py-2 outline-none">
                        <option value="up">Up</option><option value="down">Down</option>
                      </select></label>
                    <label><span className="text-[var(--text-3)]">Pips</span>
                      <input type="number" value={s.pips} onChange={e => setStep(i, { pips: e.target.value })}
                        className="mt-1 w-full rounded-lg bg-[var(--inset)] border border-[var(--border)] px-2 py-2 outline-none" /></label>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <label><span className="text-[var(--text-3)]">Bid</span>
                      <input value={s.target_bid || ''} onChange={e => setStep(i, { target_bid: e.target.value })}
                        className="mt-1 w-full rounded-lg bg-[var(--inset)] border border-[var(--border)] px-2 py-2 outline-none font-mono" /></label>
                    <label><span className="text-[var(--text-3)]">Ask</span>
                      <input value={s.target_ask || ''} onChange={e => setStep(i, { target_ask: e.target.value })}
                        className="mt-1 w-full rounded-lg bg-[var(--inset)] border border-[var(--border)] px-2 py-2 outline-none font-mono" /></label>
                  </div>
                )}
              </div>

              <label className="block mt-3 text-sm">
                <span className="text-[var(--text-3)] flex items-center gap-1"><Send className="w-3.5 h-3.5" /> Telegram message</span>
                <textarea value={s.telegram_message} onChange={e => setStep(i, { telegram_message: e.target.value })}
                  rows={2} placeholder="e.g. 📈 BUY EUR/USD now — target +20 pips, stop -10."
                  className="mt-1 w-full rounded-lg bg-[var(--inset)] border border-[var(--border)] px-3 py-2 outline-none resize-none" />
              </label>
            </div>
          ))}

          <button onClick={() => setSteps(prev => [...prev, blankStep()])}
            className="w-full py-2.5 rounded-xl border border-dashed border-[var(--border-strong)] text-[var(--text-2)] text-sm flex items-center justify-center gap-1.5 hover:bg-[var(--inset)]">
            <Plus className="w-4 h-4" /> Add step
          </button>
        </div>

        {msg && <div className="mt-4 text-sm text-[var(--accent-2)]">{msg}</div>}

        <div className="mt-4 flex gap-2">
          <button onClick={start} disabled={busy}
            className="flex-1 py-3 rounded-xl bg-[#00C805] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            <Play className="w-4 h-4" /> Start lesson
          </button>
          <button onClick={runTick} disabled={busy} title="Manually advance (or set a cron to hit /api/demo-fx/lesson-tick)"
            className="px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--text-2)] flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Run tick
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-3)]">
          Steps fire when something calls <code>/api/demo-fx/lesson-tick</code>. Add a cron (e.g. every 10s) to run lessons automatically, or use “Run tick” to advance manually.
        </p>

        {lessons.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-[var(--text-2)] mb-2">Recent lessons</h2>
            <div className="space-y-2">
              {lessons.map(l => (
                <div key={l.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{l.title} <span className="text-[var(--text-3)]">· {l.pair_symbol || ''}</span></span>
                    <span className={`text-[11px] px-2 py-0.5 rounded ${l.status === 'running' ? 'bg-[#00C805]/10 text-[#00C805]' : 'bg-[var(--inset)] text-[var(--text-3)]'}`}>{l.status}</span>
                  </div>
                  <div className="text-[12px] text-[var(--text-3)] mt-1">
                    {(l.steps || []).length} step(s) · {(l.steps || []).filter((s: any) => s.executed).length} fired
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
