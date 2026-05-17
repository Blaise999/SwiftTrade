'use client';

import Link from 'next/link';

/**
 * Swift Trade logo: a sapphire shield containing a stylized "S" formed by
 * two opposing speed lines — implies motion (Swift) and protection (custody).
 * Wordmark uses Fraunces serif for editorial feel; tagline locks the brand
 * to its origin city.
 */
export default function SwiftLogo({
  size = 'md',
  withTagline = true,
  href = '/',
}: {
  size?: 'sm' | 'md' | 'lg';
  withTagline?: boolean;
  href?: string | null;
}) {
  const dim = size === 'sm' ? 32 : size === 'lg' ? 48 : 38;
  const wordSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  const mark = (
    <div className="flex items-center gap-2.5">
      <div className="relative" style={{ width: dim, height: dim }}>
        {/* Glow halo */}
        <div className="absolute inset-0 rounded-[10px] bg-sapphire-500/30 blur-md scale-90 opacity-70" />

        {/* The mark itself */}
        <svg
          viewBox="0 0 48 48"
          width={dim}
          height={dim}
          className="relative drop-shadow-[0_2px_8px_rgba(91,109,255,0.35)]"
          aria-label="Swift Trade"
        >
          <defs>
            <linearGradient id="stMarkBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor="#7d8aff" />
              <stop offset="55%" stopColor="#5b6dff" />
              <stop offset="100%" stopColor="#2e3bb8" />
            </linearGradient>
            <linearGradient id="stMarkAccent" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fdfcf8" />
              <stop offset="100%" stopColor="#dde2ff" />
            </linearGradient>
            <linearGradient id="stMarkBolt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fdfcf8" stopOpacity="1" />
              <stop offset="100%" stopColor="#dde2ff" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Rounded square shield */}
          <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#stMarkBg)" />

          {/* Inner border highlight */}
          <rect x="2.5" y="2.5" width="43" height="43" rx="10.5"
                fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.75" />

          {/* "S" formed by two opposing speed-lines / chevrons.
              Top-right hook + bottom-left hook = an "S" silhouette,
              also reads as a lightning bolt = "Swift". */}
          <path
            d="M14 18 L26 18 Q34 18 30 24 L18 24 Q14 24 18 30 L34 30"
            fill="none"
            stroke="url(#stMarkBolt)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Up-tick accent (echoes a chart) — bottom-right corner */}
          <circle cx="34" cy="30" r="2" fill="url(#stMarkAccent)" />
          <circle cx="34" cy="30" r="3.5" fill="none" stroke="url(#stMarkAccent)" strokeWidth="0.5" opacity="0.4" />
        </svg>
      </div>

      <div className="leading-none">
        <div className={`font-serif font-medium text-pearl-50 ${wordSize} tracking-tight`}>
          Swift <span className="italic text-champagne-300/90 font-light">Trade</span>
        </div>
        {withTagline && (
          <div className="text-[9px] text-pearl-300/55 tracking-[0.28em] uppercase mt-1">
            Hong Kong · Est. 2018
          </div>
        )}
      </div>
    </div>
  );

  if (!href) return mark;
  return <Link href={href} className="group inline-block">{mark}</Link>;
}
