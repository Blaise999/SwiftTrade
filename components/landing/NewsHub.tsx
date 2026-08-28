'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Clock, Newspaper } from 'lucide-react';
import { AmbientMotion } from './AmbientMotion';

type Item = {
  id: string; market: string; headline: string; summary: string;
  source: string; url: string; image: string | null; datetime: number;
};

const MARKETS = [
  { key: 'stocks',  label: 'Wall Street', tone: 'var(--profit)', blurb: 'Equities, earnings, and the tape.' },
  { key: 'crypto',  label: 'Crypto',      tone: 'var(--gold)',   blurb: 'Digital assets and on-chain flows.' },
  { key: 'fx',      label: 'FX',          tone: '#7C5CFC',       blurb: 'Currencies, central banks, carry.' },
  { key: 'banking', label: 'Banking',     tone: '#4EA8DE',       blurb: 'Payments, settlement, remittance.' },
] as const;

function ago(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/** Fallback visual when a story ships without an image — never a broken box. */
function Fallback({ tone, seed }: { tone: string; seed: string }) {
  const n = seed.length % 3;
  return (
    <div className="absolute inset-0 overflow-hidden"
      style={{ background: `linear-gradient(${140 + n * 40}deg, color-mix(in srgb, ${tone} 22%, var(--card)), var(--card))` }}>
      <AmbientMotion variant={n === 0 ? 'grid' : n === 1 ? 'orbit' : 'scan'}
        tone={tone.includes('profit') ? 'green' : tone.includes('gold') ? 'gold' : 'violet'}
        opacity={0.5} />
      <Newspaper className="absolute bottom-3 right-3 w-5 h-5 opacity-25" style={{ color: tone }} />
    </div>
  );
}

export function NewsHub() {
  const [active, setActive] = useState<string>('stocks');
  const [cache, setCache] = useState<Record<string, Item[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cache[active]) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    fetch(`/api/news?market=${active}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (alive) setCache((c) => ({ ...c, [active]: Array.isArray(j?.items) ? j.items : [] })); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const items = cache[active] || [];
  const meta = MARKETS.find((m) => m.key === active)!;

  return (
    <section className="relative py-24 sm:py-28 overflow-hidden">
      <AmbientMotion variant="mesh" tone="mixed" opacity={0.16} />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--t-sub)] mb-3">
            <Newspaper className="w-3.5 h-3.5" /> The desk
          </div>
          <h2 className="text-[30px] sm:text-[44px] font-bold tracking-tight text-[color:var(--t-hi)] leading-[1.03]">
            Four markets. One newsroom.
          </h2>
          <p className="mt-3 text-[14.5px] text-[color:var(--t-sub)] max-w-lg">{meta.blurb}</p>
        </div>

        {/* market switcher */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-6">
          {MARKETS.map((m) => (
            <button key={m.key} onClick={() => setActive(m.key)}
              className="relative shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border"
              style={
                active === m.key
                  ? { color: '#000', background: m.tone, borderColor: m.tone }
                  : { color: 'var(--t-sub)', borderColor: 'var(--line)' }
              }>
              {m.label}
            </button>
          ))}
        </div>

        {loading && items.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-white/[0.04] animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--line)] p-12 text-center text-[color:var(--t-sub)] text-sm">
            No {meta.label.toLowerCase()} stories on the wire right now.
          </div>
        ) : (
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {items.slice(0, 9).map((n, i) => (
              <motion.a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer"
                initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: Math.min(0.3, i * 0.05) }}
                className="group relative overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] hover:border-[color:var(--line-strong)] transition-colors"
              >
                {/* image / animated fallback */}
                <div className="relative h-40 overflow-hidden">
                  {n.image ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={n.image} alt="" loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-110"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--card)] via-transparent to-transparent" />
                    </>
                  ) : (
                    <Fallback tone={meta.tone} seed={n.id} />
                  )}
                  <span className="absolute top-3 left-3 text-[9.5px] uppercase tracking-[0.16em] font-bold px-2 py-1 rounded-md backdrop-blur-sm"
                    style={{ color: meta.tone, background: 'rgba(0,0,0,0.45)' }}>
                    {meta.label}
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="text-[14.5px] font-bold text-[color:var(--t-hi)] leading-snug line-clamp-3">
                    {n.headline}
                  </h3>
                  {n.summary && (
                    <p className="mt-2 text-[12px] text-[color:var(--t-sub)] leading-relaxed line-clamp-2">
                      {n.summary}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-[color:var(--t-sub)]">
                    <span className="font-medium truncate max-w-[50%]">{n.source}</span>
                    <span className="opacity-40">·</span>
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{ago(n.datetime)} ago</span>
                  </div>
                </div>
                <ArrowUpRight className="absolute top-3 right-3 w-4 h-4 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.a>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

export default NewsHub;
