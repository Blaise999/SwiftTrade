'use client';

import { useState } from 'react';

/**
 * AssetLogo — real stock/crypto logos by ticker, with a graceful fallback to a
 * letter badge (so a missing logo never breaks the layout).
 *
 * Stocks/ETFs → Parqet logo CDN (keyed by ticker, no API key needed).
 * Crypto      → CoinCap icons (keyed by lowercase symbol).
 * If you have a logo.dev token, swap the stock URL for:
 *   `https://img.logo.dev/ticker/${symbol}?token=YOUR_TOKEN&format=png`
 */
export function AssetLogo({
  symbol,
  kind = 'stock',
  size = 40,
  className = '',
}: {
  symbol: string;
  kind?: 'stock' | 'etf' | 'crypto';
  size?: number;
  className?: string;
}) {
  const [stage, setStage] = useState(0);
  const sym = (symbol || '').toUpperCase();

  // ordered source chain per asset type; fall through on error, then letter badge
  const sources = kind === 'crypto'
    ? [
        `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@master/128/color/${sym.toLowerCase()}.png`,
        `https://assets.coincap.io/assets/icons/${sym.toLowerCase()}@2x.png`,
      ]
    : [
        `https://assets.parqet.com/logos/symbol/${sym}?format=png`,
        `https://logo.clearbit.com/${sym.toLowerCase()}.com`,
      ];

  if (stage >= sources.length || !sym) {
    return (
      <div
        className={`rounded-xl bg-[var(--inset)] border border-[var(--border)] flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="font-bold text-[var(--text)]" style={{ fontSize: size * 0.3 }}>
          {sym.slice(0, 3)}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sources[stage]}
      alt={sym}
      width={size}
      height={size}
      onError={() => setStage((s) => s + 1)}
      className={`rounded-xl ${kind === 'crypto' ? '' : 'bg-white'} object-contain ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}

export default AssetLogo;
