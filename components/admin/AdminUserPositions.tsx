'use client';

import { useEffect, useState } from 'react';

type Pos = { symbol: string; quantity: number; avgPrice: number };

/** Self-contained admin editor: a user's positions + withdrawal address. */
export function AdminUserPositions({ userId }: { userId: string }) {
  const [crypto, setCrypto] = useState<Pos[]>([]);
  const [stocks, setStocks] = useState<Pos[]>([]);
  const [wAddr, setWAddr] = useState('');
  const [wNet, setWNet] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // add-new form
  const [nKind, setNKind] = useState<'crypto' | 'stock'>('crypto');
  const [nSym, setNSym] = useState('');
  const [nQty, setNQty] = useState('');
  const [nAvg, setNAvg] = useState('');

  const load = async () => {
    try {
      const p = await (await fetch(`/api/admin/users/${userId}/positions`, { cache: 'no-store' })).json();
      setCrypto(p?.crypto || []); setStocks(p?.stocks || []);
      const w = await (await fetch(`/api/admin/users/${userId}/withdrawal-address`, { cache: 'no-store' })).json();
      setWAddr(w?.withdrawal_address || ''); setWNet(w?.withdrawal_network || '');
    } catch {}
  };
  useEffect(() => { if (userId) load(); /* eslint-disable-next-line */ }, [userId]);

  const savePos = async (kind: 'crypto' | 'stock', symbol: string, quantity: number, avgPrice: number, remove = false) => {
    setBusy(true); setMsg('');
    try {
      await fetch(`/api/admin/users/${userId}/positions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, symbol, quantity, avgPrice, remove }),
      });
      setMsg(remove ? `Removed ${symbol}` : `Saved ${symbol}`);
      await load();
    } catch { setMsg('Failed'); } finally { setBusy(false); }
  };

  const saveWithdrawal = async () => {
    setBusy(true); setMsg('');
    try {
      await fetch(`/api/admin/users/${userId}/withdrawal-address`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wAddr, network: wNet }),
      });
      setMsg('Withdrawal address saved');
    } catch { setMsg('Failed'); } finally { setBusy(false); }
  };

  const Row = ({ kind, p }: { kind: 'crypto' | 'stock'; p: Pos }) => {
    const [q, setQ] = useState(String(p.quantity));
    const [a, setA] = useState(String(p.avgPrice));
    return (
      <div className="flex items-center gap-2 py-1.5">
        <span className="w-16 text-sm font-semibold text-cream">{p.symbol}</span>
        <input value={q} onChange={e => setQ(e.target.value.replace(/[^\d.]/g, ''))} placeholder="qty"
          className="w-24 px-2 py-1 rounded bg-white/5 border border-white/10 text-cream text-xs" />
        <input value={a} onChange={e => setA(e.target.value.replace(/[^\d.]/g, ''))} placeholder="avg $"
          className="w-24 px-2 py-1 rounded bg-white/5 border border-white/10 text-cream text-xs" />
        <button disabled={busy} onClick={() => savePos(kind, p.symbol, Number(q), Number(a))}
          className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-xs">Save</button>
        <button disabled={busy} onClick={() => savePos(kind, p.symbol, 0, 0, true)}
          className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-xs">Remove</button>
      </div>
    );
  };

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h4 className="text-sm font-semibold text-cream mb-2">Positions</h4>
      {msg && <div className="text-xs text-emerald-400 mb-2">{msg}</div>}

      <div className="text-[11px] uppercase tracking-wider text-cream/40 mt-1">Crypto</div>
      {crypto.length ? crypto.map(p => <Row key={'c' + p.symbol} kind="crypto" p={p} />) : <div className="text-xs text-cream/40 py-1">None</div>}

      <div className="text-[11px] uppercase tracking-wider text-cream/40 mt-3">Stocks</div>
      {stocks.length ? stocks.map(p => <Row key={'s' + p.symbol} kind="stock" p={p} />) : <div className="text-xs text-cream/40 py-1">None</div>}

      {/* add new */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="text-[11px] uppercase tracking-wider text-cream/40 mb-1.5">Add / set position</div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={nKind} onChange={e => setNKind(e.target.value as any)}
            className="px-2 py-1 rounded bg-white/5 border border-white/10 text-cream text-xs">
            <option value="crypto">Crypto</option><option value="stock">Stock</option>
          </select>
          <input value={nSym} onChange={e => setNSym(e.target.value.toUpperCase())} placeholder="SYMBOL"
            className="w-24 px-2 py-1 rounded bg-white/5 border border-white/10 text-cream text-xs" />
          <input value={nQty} onChange={e => setNQty(e.target.value.replace(/[^\d.]/g, ''))} placeholder="qty"
            className="w-20 px-2 py-1 rounded bg-white/5 border border-white/10 text-cream text-xs" />
          <input value={nAvg} onChange={e => setNAvg(e.target.value.replace(/[^\d.]/g, ''))} placeholder="avg $"
            className="w-20 px-2 py-1 rounded bg-white/5 border border-white/10 text-cream text-xs" />
          <button disabled={busy || !nSym} onClick={async () => { await savePos(nKind, nSym, Number(nQty), Number(nAvg)); setNSym(''); setNQty(''); setNAvg(''); }}
            className="px-3 py-1 rounded bg-emerald-500 text-black text-xs font-bold">Add</button>
        </div>
      </div>

      {/* withdrawal address */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="text-[11px] uppercase tracking-wider text-cream/40 mb-1.5">Withdrawal address</div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={wAddr} onChange={e => setWAddr(e.target.value)} placeholder="0x… / address"
            className="flex-1 min-w-[200px] px-2 py-1.5 rounded bg-white/5 border border-white/10 text-cream text-xs font-mono" />
          <input value={wNet} onChange={e => setWNet(e.target.value)} placeholder="network (e.g. ERC20)"
            className="w-32 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-cream text-xs" />
          <button disabled={busy} onClick={saveWithdrawal}
            className="px-3 py-1.5 rounded bg-emerald-500 text-black text-xs font-bold">Save</button>
        </div>
      </div>
    </div>
  );
}

export default AdminUserPositions;
