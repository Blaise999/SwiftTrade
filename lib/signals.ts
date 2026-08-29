/**
 * Position signals — computed from real price history, not opinions.
 *
 * IMPORTANT: these are descriptive readings of what price has already done
 * (trend, momentum, volatility regime, position sizing). They are NOT
 * predictions and NOT recommendations to buy or sell. Every consumer of this
 * module must present them as observations with the reasoning shown, so the
 * user can judge for themselves.
 */

export type Signal = {
  key: string;
  label: string;
  reading: string;
  detail: string;
  tone: 'good' | 'warn' | 'info' | 'bad';
};

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/** Simple moving average of the last n closes. */
export function sma(prices: number[], n: number): number | null {
  if (prices.length < n) return null;
  return avg(prices.slice(-n));
}

/** Relative Strength Index (Wilder, 14-period default). */
export function rsi(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  const ag = gains / period, al = losses / period;
  if (al === 0) return 100;
  const rs = ag / al;
  return 100 - 100 / (1 + rs);
}

/** Annualised volatility from a close series. */
export function volatility(prices: number[]): number {
  if (prices.length < 6) return 0;
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) if (prices[i - 1] > 0) r.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  const m = avg(r);
  const v = r.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, r.length - 1);
  return Math.sqrt(v) * Math.sqrt(365) * 100;
}

/** Distance from the highest close in the window, as a negative %. */
export function drawdownFromHigh(prices: number[]): number {
  if (!prices.length) return 0;
  const hi = Math.max(...prices);
  const last = prices[prices.length - 1];
  return hi > 0 ? ((last - hi) / hi) * 100 : 0;
}

/**
 * Build readable signals for one position.
 * `weight` is the position's share of the portfolio (0-100).
 */
export function positionSignals(opts: {
  symbol: string;
  prices: number[];
  price: number;
  avgCost: number;
  weight: number;
}): { signals: Signal[]; summary: string; horizon: string } {
  const { prices, price, avgCost, weight } = opts;
  const signals: Signal[] = [];

  const s20 = sma(prices, 20);
  const s50 = sma(prices, 50) ?? sma(prices, Math.min(50, Math.floor(prices.length / 2)));
  const r = rsi(prices);
  const vol = volatility(prices);
  const dd = drawdownFromHigh(prices);
  const pnlPct = avgCost > 0 ? ((price - avgCost) / avgCost) * 100 : 0;

  // ── trend ──
  if (s20 != null && s50 != null) {
    const above20 = price > s20;
    const golden = s20 > s50;
    signals.push({
      key: 'trend',
      label: 'Trend',
      reading: golden && above20 ? 'Uptrend' : !golden && !above20 ? 'Downtrend' : 'Mixed',
      detail: golden && above20
        ? `Price is above its 20-day average, and the 20-day sits above the 50-day. That is what a healthy uptrend looks like on this timeframe.`
        : !golden && !above20
        ? `Price is below both its 20- and 50-day averages. Momentum has been against this position.`
        : `Price and its averages disagree — the short-term move has not confirmed the longer one yet.`,
      tone: golden && above20 ? 'good' : !golden && !above20 ? 'bad' : 'info',
    });
  }

  // ── momentum ──
  if (r != null) {
    signals.push({
      key: 'rsi',
      label: 'Momentum (RSI)',
      reading: r >= 70 ? `${r.toFixed(0)} — stretched` : r <= 30 ? `${r.toFixed(0)} — washed out` : `${r.toFixed(0)} — neutral`,
      detail: r >= 70
        ? 'Buying has been persistent enough that RSI is in territory that historically precedes pauses. It is not a sell trigger — strong trends can stay stretched for weeks.'
        : r <= 30
        ? 'Selling has been persistent. Oversold readings often precede bounces, but they also appear right through genuine declines.'
        : 'Momentum is balanced — neither side has been dominant recently.',
      tone: r >= 70 ? 'warn' : r <= 30 ? 'info' : 'good',
    });
  }

  // ── volatility regime ──
  if (vol > 0) {
    signals.push({
      key: 'vol',
      label: 'Volatility',
      reading: `${vol.toFixed(0)}% annualised`,
      detail: vol >= 80
        ? `This moves violently. A position this size can swing meaningfully in a single session — size it as though a 20% day is normal, because for this asset it is.`
        : vol >= 40
        ? `Moderately volatile. Expect double-digit weeks in both directions.`
        : `Relatively calm. Large single-day moves would be unusual here.`,
      tone: vol >= 80 ? 'warn' : vol >= 40 ? 'info' : 'good',
    });
  }

  // ── drawdown ──
  if (dd < -5) {
    signals.push({
      key: 'dd',
      label: 'Off recent high',
      reading: `${dd.toFixed(0)}%`,
      detail: dd < -30
        ? 'Well off its high for the window. Deep drawdowns need a reason to recover — check whether the thesis that got you in still holds.'
        : 'Some distance below its recent peak, which is ordinary within an uptrend.',
      tone: dd < -30 ? 'warn' : 'info',
    });
  }

  // ── position sizing (the one that actually protects people) ──
  if (weight >= 30) {
    signals.push({
      key: 'size',
      label: 'Position size',
      reading: `${weight.toFixed(0)}% of portfolio`,
      detail: `This single name drives roughly ${weight.toFixed(0)}% of your outcomes. Whatever your view, concentration is the risk most likely to hurt you — it is the one variable fully in your control.`,
      tone: weight >= 50 ? 'bad' : 'warn',
    });
  }

  // ── your P&L context ──
  if (avgCost > 0) {
    signals.push({
      key: 'pnl',
      label: 'Your position',
      reading: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`,
      detail: pnlPct >= 0
        ? `You are up on this. Note that your entry price is irrelevant to what happens next — the market has no memory of what you paid.`
        : `You are down on this. The same applies in reverse: "getting back to even" is not a reason to hold something you would not buy today.`,
      tone: 'info',
    });
  }

  // ── summary + horizon framing ──
  const bullish = signals.filter((s) => s.tone === 'good').length;
  const bearish = signals.filter((s) => s.tone === 'bad' || s.tone === 'warn').length;

  const summary =
    bullish > bearish
      ? 'Recent price action has been constructive on this timeframe.'
      : bearish > bullish
      ? 'Recent price action has been working against this position.'
      : 'Signals are mixed — nothing here points strongly either way.';

  const horizon =
    vol >= 80
      ? 'Assets this volatile tend to reward longer holding periods, because short windows are dominated by noise rather than direction.'
      : vol >= 40
      ? 'At this volatility, weekly moves say little. Judge the position over months rather than days.'
      : 'Calmer assets make trends easier to read, but they still need time to play out.';

  return { signals, summary, horizon };
}
