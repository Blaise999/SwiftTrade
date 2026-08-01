'use client';

import { useState } from 'react';
import { Eye, EyeOff, TrendingUp, TrendingDown } from 'lucide-react';
import { useNetWorth } from './useNetWorth';

const usd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

/**
 * NetWorthCard — the single headline number, computed from the ledger spine.
 * Drop into app/dashboard/page.tsx and pass the current userId. This replaces
 * any client-store total so the dashboard can never disagree with the wallet.
 */
export function NetWorthCard({ userId }: { userId: string | null }) {
  const { data, loading, error } = useNetWorth(userId);
  const [hidden, setHidden] = useState(false);

  const total = data?.totalNetWorthUsd ?? 0;
  const pnl = data?.totalUnrealizedPnlUsd ?? 0;
  const up = pnl >= 0;

  return (
    <div className="rounded-2xl border border-[color:var(--line,#26262b)] bg-[color:var(--wash-strong,#141417)] p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-neutral-400">Total Net Worth</span>
        <button
          onClick={() => setHidden((h) => !h)}
          className="text-neutral-400 hover:text-neutral-200"
          aria-label={hidden ? 'Show balance' : 'Hide balance'}
        >
          {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div className="mt-2 text-3xl font-semibold text-neutral-50">
        {loading && !data ? (
          <span className="text-neutral-500">Loading…</span>
        ) : hidden ? (
          '••••••'
        ) : (
          usd(total)
        )}
      </div>

      {!hidden && data && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className={up ? 'text-emerald-400' : 'text-rose-400'}>
            {up ? <TrendingUp size={14} className="inline" /> : <TrendingDown size={14} className="inline" />}{' '}
            {up ? '+' : ''}
            {usd(pnl)} unrealized
          </span>
        </div>
      )}

      {!hidden && data && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-black/20 p-3">
            <div className="text-xs text-neutral-400">Cash</div>
            <div className="font-medium text-neutral-100">{usd(data.cashUsd + data.bonusUsd)}</div>
          </div>
          <div className="rounded-lg bg-black/20 p-3">
            <div className="text-xs text-neutral-400">Holdings</div>
            <div className="font-medium text-neutral-100">{usd(data.positionsValueUsd)}</div>
          </div>
        </div>
      )}

      {data?.unpriced?.length ? (
        <p className="mt-3 text-xs text-amber-400/80">
          No live price for: {data.unpriced.join(', ')} — shown at 0 until the feed returns.
        </p>
      ) : null}

      {error && <p className="mt-3 text-xs text-rose-400/80">{error}</p>}
    </div>
  );
}

export default NetWorthCard;
