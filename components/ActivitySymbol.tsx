'use client';

import { AssetLogo } from '@/components/AssetLogo';
import {
  ArrowDownLeft, ArrowUpRight, ShieldCheck, ShieldOff, Globe,
  TrendingUp, TrendingDown, Gift, Coins, Bell,
} from 'lucide-react';

/** Category accent colours, shared by history, dashboard activity and notifications. */
export const KIND_ACCENT: Record<string, string> = {
  trade: '#00C805',
  buy: '#00C805',
  sell: '#FF6B57',
  deposit: '#4EA8DE',
  withdrawal: '#FF6B57',
  bridge: '#7C5CFC',
  shield: '#00C805',
  unshield: '#8A94A6',
  fee: '#E4C883',
  referral: '#E4C883',
  bonus: '#E4C883',
  rate_alert: '#4EA8DE',
  default: '#8A94A6',
};

export function kindAccent(kind?: string) {
  return KIND_ACCENT[String(kind || '').toLowerCase()] || KIND_ACCENT.default;
}

const ICONS: Record<string, any> = {
  trade: TrendingUp,
  buy: TrendingUp,
  sell: TrendingDown,
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  bridge: Globe,
  shield: ShieldCheck,
  unshield: ShieldOff,
  fee: Coins,
  referral: Gift,
  bonus: Gift,
  rate_alert: Bell,
};

/** Pull a ticker out of a title like "Bought AAPL" or "🛡️ ETH shielded". */
export function extractSymbol(text?: string, explicit?: string | null): string | null {
  if (explicit && /^[A-Z0-9.]{2,6}$/i.test(explicit)) return explicit.toUpperCase();
  if (!text) return null;
  const cleaned = text.replace(/[^\w\s/]/g, ' ');
  const m = cleaned.match(/\b([A-Z]{2,6})\b/);
  return m ? m[1] : null;
}

/** Is this a fiat currency code we can show a flag for? */
const FLAG: Record<string, string> = {
  USD: 'us', EUR: 'eu', GBP: 'gb', NGN: 'ng', HKD: 'hk', PHP: 'ph', INR: 'in',
  GHS: 'gh', KES: 'ke', ZAR: 'za', JPY: 'jp', SGD: 'sg', MXN: 'mx', BRL: 'br',
  TRY: 'tr', CNY: 'cn', CAD: 'ca', AUD: 'au', AED: 'ae', EGP: 'eg', THB: 'th',
  IDR: 'id', VND: 'vn', MYR: 'my', PKR: 'pk', KRW: 'kr', TWD: 'tw', UGX: 'ug',
  TZS: 'tz', CLP: 'cl', COP: 'co', ARS: 'ar', NZD: 'nz', CHF: 'ch', SEK: 'se',
  NOK: 'no', DKK: 'dk', PLN: 'pl', CZK: 'cz', HUF: 'hu',
};

export function CurrencyFlag({ code, size = 20 }: { code?: string | null; size?: number }) {
  const cc = code ? FLAG[code.toUpperCase()] : null;
  if (!cc) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${cc}.png`}
      alt={code || ''}
      width={size} height={Math.round(size * 0.72)}
      loading="lazy"
      className="rounded-[3px] shrink-0"
    />
  );
}

/**
 * The avatar used across history, dashboard activity and notifications:
 * the real asset logo when we know the ticker, otherwise a tinted category icon.
 * A small badge in the corner always shows the category.
 */
export function ActivitySymbol({
  kind, symbol, currency, size = 40,
}: {
  kind?: string;
  symbol?: string | null;
  currency?: string | null;
  size?: number;
}) {
  const k = String(kind || '').toLowerCase();
  const accent = kindAccent(k);
  const Icon = ICONS[k] || Bell;
  const badge = Math.max(16, Math.round(size * 0.44));

  // currency corridors (bridge, deposits in local money) get a flag
  const flagCode = currency && FLAG[currency.toUpperCase()] ? currency.toUpperCase() : null;

  const inner = symbol ? (
    <AssetLogo
      symbol={symbol}
      kind={k === 'trade' || k === 'buy' || k === 'sell' || k === 'shield' || k === 'unshield' ? 'crypto' : 'stock'}
      size={size}
      className="rounded-xl"
    />
  ) : flagCode ? (
    <div className="rounded-xl grid place-items-center overflow-hidden"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${accent} 16%, transparent)` }}>
      <CurrencyFlag code={flagCode} size={Math.round(size * 0.62)} />
    </div>
  ) : (
    <div className="rounded-xl grid place-items-center"
      style={{ width: size, height: size, background: `color-mix(in srgb, ${accent} 16%, transparent)` }}>
      <Icon style={{ color: accent, width: size * 0.45, height: size * 0.45 }} />
    </div>
  );

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {inner}
      {(symbol || flagCode) && (
        <span
          className="absolute -bottom-1 -right-1 rounded-full grid place-items-center border-2"
          style={{
            width: badge, height: badge,
            background: accent,
            borderColor: 'var(--surface, #0B0D14)',
          }}
        >
          <Icon style={{ color: '#000', width: badge * 0.55, height: badge * 0.55 }} />
        </span>
      )}
    </div>
  );
}

export default ActivitySymbol;
