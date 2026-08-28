'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowUpRight, Clock } from 'lucide-react';

type Item = {
  id: string; market: 'stocks' | 'crypto' | 'fx';
  headline: string; summary: string; source: string;
  url: string; image: string | null; datetime: number;
};

const TABS = [
  { key: 'all', label: 'All markets' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'fx', label: 'FX' },
] as const;

const TONE: Record<string, string> = {
  stocks: 'var(--profit)',
  crypto: 'var(--gold)',
  fx: '#7C5CFC',
};

function ago(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Deterministic pseudo-random so the "random" layout is stable per render set. */
function rand(seed: string, i: number) {
  let h = 2166136261;
  const s = seed + i;
  for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}

export function NewsWall() {
  const [tab, setTab] = useState<typeof TABS[number]['key']>('all');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/news?market=${tab}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => { if (alive) setItems(Array.isArray(j?.items) ? j.items : []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tab]);

  // Editorial layout: 1 lead + staggered mosaic. Sizes vary so it never
  // reads as a rigid grid — on mobile it becomes a snap-scroll rail.
  const { lead, mosaic } = useMemo(() => {
    const withImg = items.filter((i) => i.image);
    const noImg = items.filter((i) => !i.image);
    const ordered = [...withImg, ...noImg];
    return { lead: ordered[0] || null, mosaic: ordered.slice(1, 13) };
  }, [items]);

  return (
    <section ref={ref} className="relative overflow-hidden py-20 sm:py-28">
      {/* MOTION SLOT A — ambient loop behind the whole section.
          Drop a WebP at /public/motion/news-ambient.webp (960x420, <=120KB). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14] motion-reduce:hidden"
        style={{
          backgroundImage: 'url(/motion/news-ambient.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          maskImage: 'radial-gradient(ellipse at 70% 30%, black 35%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 70% 30%, black 35%, transparent 72%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* head */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--t-sub)] mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--profit)] animate-pulse motion-reduce:animate-none" />
              Live newsroom
            </div>
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-tight text-[color:var(--t-hi)] leading-[1.05]">
              The markets,<br className="hidden sm:block" /> as they happen.
            </h2>
          </div>

          {/* tabs */}
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3.5 py-2 rounded-full text-[12.5px] font-semibold transition-all ${
                  tab === t.key
                    ? 'bg-[color:var(--t-hi)] text-black'
                    : 'text-[color:var(--t-sub)] border border-[color:var(--line)] hover:border-[color:var(--line-strong)] hover:text-[color:var(--t-hi)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-white/[0.04] animate-pulse motion-reduce:animate-none" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-[color:var(--line)] p-10 text-center text-[color:var(--t-sub)] text-sm">
            Newsroom is quiet right now — check back shortly.
          </div>
        ) : (
          <>
            {/* LEAD STORY — big, asymmetric */}
            {lead && (
              <motion.a
                href={lead.url} target="_blank" rel="noopener noreferrer"
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="group relative block overflow-hidden rounded-3xl border border-[color:var(--line)] mb-4"
              >
                <div className="grid md:grid-cols-5">
                  <div className="md:col-span-3 relative min-h-[220px] overflow-hidden">
                    {lead.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={lead.image} alt="" loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </div>
                  <div className="md:col-span-2 p-6 sm:p-7 flex flex-col justify-center bg-[color:var(--card)]">
                    <Badge market={lead.market} />
                    <h3 className="mt-3 text-[19px] sm:text-[22px] font-bold text-[color:var(--t-hi)] leading-snug">
                      {lead.headline}
                    </h3>
                    {lead.summary && (
                      <p className="mt-2 text-[13px] text-[color:var(--t-sub)] leading-relaxed line-clamp-3">
                        {lead.summary}
                      </p>
                    )}
                    <Meta source={lead.source} datetime={lead.datetime} />
                  </div>
                </div>
              </motion.a>
            )}

            {/* MOSAIC — varied spans, snap-rail on mobile */}
            <div className="
              flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4
              sm:mx-0 sm:px-0 sm:overflow-visible sm:grid sm:grid-cols-6 sm:gap-4
            ">
              {mosaic.map((n, i) => {
                const r = rand(n.id, i);
                // vary column span + whether the card shows an image
                const span = r > 0.72 ? 'sm:col-span-3' : r > 0.34 ? 'sm:col-span-2' : 'sm:col-span-2';
                const tall = r > 0.72;
                return (
                  <motion.a
                    key={n.id}
                    href={n.url} target="_blank" rel="noopener noreferrer"
                    initial={{ opacity: 0, y: 16 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.45, delay: Math.min(0.3, 0.04 * i), ease: [0.22, 1, 0.36, 1] }}
                    className={`group snap-start shrink-0 w-[78vw] sm:w-auto ${span} relative overflow-hidden rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] hover:border-[color:var(--line-strong)] transition-colors`}
                  >
                    {tall && n.image && (
                      <div className="relative h-32 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={n.image} alt="" loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--card)] to-transparent" />
                      </div>
                    )}
                    <div className="p-4">
                      <Badge market={n.market} />
                      <h4 className="mt-2.5 text-[14.5px] font-semibold text-[color:var(--t-hi)] leading-snug line-clamp-3">
                        {n.headline}
                      </h4>
                      <Meta source={n.source} datetime={n.datetime} />
                    </div>
                    <ArrowUpRight className="absolute top-3.5 right-3.5 w-4 h-4 text-[color:var(--t-sub)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.a>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Badge({ market }: { market: Item['market'] }) {
  const label = market === 'fx' ? 'FX' : market === 'crypto' ? 'Crypto' : 'Stocks';
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-bold px-2 py-1 rounded-md"
      style={{ color: TONE[market], background: `color-mix(in srgb, ${TONE[market]} 12%, transparent)` }}
    >
      {label}
    </span>
  );
}

function Meta({ source, datetime }: { source: string; datetime: number }) {
  return (
    <div className="mt-3 flex items-center gap-2 text-[11px] text-[color:var(--t-sub)]">
      <span className="font-medium truncate max-w-[45%]">{source}</span>
      <span className="opacity-40">·</span>
      <Clock className="w-3 h-3 shrink-0" />
      <span>{ago(datetime)}</span>
    </div>
  );
}

export default NewsWall;
