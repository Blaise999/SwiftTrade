'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Check, ShieldCheck } from 'lucide-react';
import { useStore } from '@/lib/supabase/store-supabase';
import { TIERS } from '@/lib/tier';


export default function TierCheckout() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useStore();
  const code = params.get('tier') || 'trader';
  const tier = useMemo(() => TIERS.find(t => t.code === code) || TIERS[1], [code]);

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    const uid = (user as any)?.id;
    if (!uid) { setErr('Please sign in first.'); return; }
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/tier-purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, tierCode: tier.code, amountPaid: tier.price }),
      });
      const j = await res.json();
      if (res.ok && (j?.ok !== false)) setDone(true);
      else setErr(j?.error || 'Could not submit. Try again.');
    } catch (e: any) { setErr(e?.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center rounded-3xl border border-[var(--accent)]/30 bg-[var(--accent)]/[0.06] p-8">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] text-[#04140A] flex items-center justify-center mx-auto mb-4 glow-up">
            <Check className="w-7 h-7" />
          </div>
          <h1 className="text-[19px] font-bold text-[var(--text)]">Request received</h1>
          <p className="text-[13px] text-[var(--text-2)] mt-2">
            Your <span className="text-[var(--text)] font-semibold">{tier.name}</span> upgrade is pending. Our desk will confirm your
            payment and activate it shortly — you&apos;ll get a notification the moment it&apos;s live.
          </p>
          <Link href="/dashboard" className="mt-6 inline-block w-full py-3 rounded-2xl bg-[var(--accent)] text-[#04140A] font-bold">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden pb-28">
      <div className="w-full max-w-md mx-auto px-4 pt-5">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-[var(--text-3)] hover:text-[var(--text)] mb-4">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="text-[11px] uppercase tracking-wider text-[var(--text-3)]">Upgrade to</div>
          <div className="flex items-end justify-between mt-1">
            <div className="text-[22px] font-extrabold text-[var(--text)]">{tier.name}</div>
            <div className="text-[22px] font-extrabold text-[var(--text)] tabular-nums">${tier.price.toLocaleString()}</div>
          </div>
          <div className="text-[12px] text-[var(--text-3)]">{tier.tagline} · one-time</div>

          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
            {tier.perks.map((p) => (
              <div key={p} className="flex items-start gap-2 text-[12.5px] text-[var(--text-2)]">
                <Check className="w-4 h-4 mt-[1px] shrink-0" style={{ color: tier.accent }} />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-4 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[var(--accent-2)] mt-0.5 shrink-0" />
          <p className="text-[12px] text-[var(--text-2)] leading-relaxed">
            Submitting sends an upgrade request to our desk. Once your payment is confirmed, your tier activates automatically and
            unlocks its benefits across the app.
          </p>
        </div>

        {err && <div className="mt-3 text-[13px] text-[#FF4D3D]">{err}</div>}

        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full py-3.5 rounded-2xl bg-[var(--accent)] text-[#04140A] font-bold glow-up disabled:opacity-60"
        >
          {busy ? 'Submitting…' : `Confirm — $${tier.price.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
