# UI/UX + data fixes (this pass)

## Fixed in code
- **Broken stock cards** (`components/investing/EtfCards.tsx`): the STOCK/ETF badge no longer
  overlaps the symbol (symbol truncates, card has a hard `min-w-[200px]` so it can't collapse
  in the scroller). Recolored to theme tokens → clean in light AND dark.
- **Removed an aggressive CSS rule** (`*{min-width:0}`) from the theme that could collapse
  fixed-width flex cards — a likely cause of the squished/overlapping rows.
- **Coloring consistency** (kills the half-light/dirty look): token-refactored the screens you
  showed + the rest of the common ones — invest browse, portfolio, crypto trade, sp500, etfs.
  These now follow dark/light properly instead of staying dark in light mode.
- Stock detail page (previous pass) is already token-based + responsive.

## What is STILL an API-key issue (your side, not code)
Set these in Vercel → Settings → Environment Variables, then redeploy:
- FX: `OANDA_API_TOKEN`, `OANDA_ENV`, `OANDA_REST_URL`  ← fixes the `MISSING_API_KEY` chart
- Stocks: `ALPACA_API_KEY_ID`, `ALPACA_API_SECRET_KEY`, `FINNHUB_API_KEY`
- Crypto: `COINGECKO_API_KEY`
Without these the app falls back to reference prices and empty charts — that's the remaining
"confused data." It's config, not code.

## Still on my list (told you honestly)
- **FX page** (`app/dashboard/trade/fx/page.tsx`, 2,856 lines): mobile has no room to trade,
  and the chart canvas stays dark in light mode. I'm doing this as a careful focused pass
  rather than a blind edit to a huge trading file — it's the one screen most likely to break
  if rushed.

## Pass 2 (this zip)
- Recolored the dashboard hero gradient, FX page chrome, PortfolioCommandCard, and
  MobileBottomNav to tokens — kills the remaining dark-in-light patches (chart CANVAS
  colors in the FX page are set in JS and still dark; that's a separate follow-up).
- **Portfolio rebuilt**: now lists your actual holdings — Crypto and Stocks/ETFs — with
  per-position value, P&L, and a **Shield toggle on each holding** (crypto → PATCH
  /api/portfolio, stock → POST /api/positions/shield). No more portfolio-wide shield.
  Totals: Net worth = cash + crypto + stocks, from one place.
- Added `positions.shield_enabled` (+ endpoint) so stocks can be shielded like crypto.
  The RESET_AND_REBUILD.sql reconcile now creates that column.
