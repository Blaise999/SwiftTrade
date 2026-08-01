# SwiftTrade — drop 4: stocks unified · shiny theme · viewport fit

## 1) Anything stock → the invest screen
The chart terminal is retired. Both destination pages now redirect, so EVERY existing
stock link funnels to the ledger-backed invest experience — no need to hunt them all down:
- `app/dashboard/trade/stocks/page.tsx` → `/dashboard/invest` (or `…/asset/AAPL` if `?symbol=`)
- `app/stocks/page.tsx` → `/dashboard/invest`

Optional (cleaner — skips the redirect hop). Change the primary nav labels' hrefs from
`/dashboard/trade/stocks` → `/dashboard/invest` in:
`app/dashboard/layout.tsx`, `app/components/Navigation.tsx`, `app/components/Footer.tsx`
(and the duplicate `components/Navigation.tsx` / `components/Footer.tsx`).

Symbol-specific tiles should deep-link to the asset buy screen. In
`components/dashboard/MarketPulse.tsx`, set each equity row's href to
``/dashboard/invest/asset/${symbol}`` instead of `/dashboard/trade/stocks`.

> Note: you now have TWO stock-position sources historically — the invest screen (real
> ledger, `positions` table) and the old terminal's client store. With the terminal
> retired, the invest screen is the single source, matching the net-worth spine. Good.

## 2) Shiny theme (keeps your navy + gold identity, sharpened)
`styles/swift-theme.css` refines your existing tokens (deeper navy, luminous gold, higher
text contrast, distinctive amber loss) and adds a gold-aurora background, real specular
card edges, gilt headline text, and a brushed-gold primary button.

Apply it — import AFTER globals.css (once), in `app/layout.tsx`:
```ts
import './globals.css';
import '../styles/swift-theme.css';
```
Then use the helpers where they earn it (don't over-apply):
- Page background: add class `swf-surface` to the dashboard/app shell (or it auto-applies
  to `body` in dark mode).
- Cards: `class="swf-card"` on panels (replaces ad-hoc `bg-[#0F1D33] border …`).
- Headline total on the dashboard: wrap the number in `class="swf-gilt"`.
- Primary CTA (Buy / Swap / Lock In): `class="swf-gold-btn"`.
- Prices: `swf-profit` / `swf-loss`.

## 3) "Don't zoom out to see it"
The same file adds a viewport-fit guard that removes accidental horizontal overflow (the
usual cause of needing to zoom out): `overflow-x: hidden` on the page, `min-width: 0` so
flex/grid children can shrink instead of forcing width, and `max-width:100%` on media.

For any screen that still feels wide, wrap its content in `class="swf-fit"` (a centered
column that scales with the viewport, `max-width: 1200px`, fluid padding). Only put
`swf-scroll-x` on the specific wide element that truly needs sideways scroll (a data table
or full chart) — nothing else should scroll horizontally.

Quick check: open the dashboard and each trade screen at 100% zoom on a laptop and on a
phone width — no element should push past the right edge. If one does, it has a fixed
`w-[NNNpx]` or `whitespace-nowrap` on a long row; swap the fixed width for `w-full`/`max-w-`
or wrap that one element in `swf-scroll-x`.

## Build order
1. ✅ spine  2. ✅ dashboard total + risk meter  3. ✅ crypto  4. ✅ stocks reconciled
5. ✅ bridge worker  •  net-worth price fix  •  stocks unified + theme + fit ← here
6. ⏭ FX (last) on the demo-fx engine
