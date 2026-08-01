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
  const [failed, setFailed] = useState(false);
  const sym = (symbol || '').toUpperCase();

  const src =
    kind === 'crypto'
      ? `https://assets.coincap.io/assets/icons/${sym.toLowerCase()}@2x.png`
      : `https://assets.parqet.com/logos/symbol/${sym}?format=png`;

  if (failed || !sym) {
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
      src={src}
      alt={sym}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={`rounded-xl bg-white object-contain ${className}`}
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}

export default AssetLogo;
