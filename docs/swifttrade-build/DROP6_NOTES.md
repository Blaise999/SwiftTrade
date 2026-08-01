# SwiftTrade — drop 6: Robinhood-light theme · stock recolored · FX ticket → regular FX

## 1) FX ticket now works on regular FX too
`components/trade/FxOrderTicket.tsx` takes a `variant`:
- `variant="regular"` (default) → posts to `/api/trades` with `asset: pairSymbol`
- `variant="demo-fx"` → posts to `/api/demo-fx/trades` with `pair_id: pairId`
Both send the same `direction, investment, multiplier, stop_loss, take_profit`. Use the
right one per screen:
```tsx
// regular FX pair
<FxOrderTicket variant="regular" pairSymbol="EUR/USD" price={livePrice}
  getAuthToken={headerAuthToken} onOpened={reloadTrades} />
// demo-fx / rare pair
<FxOrderTicket variant="demo-fx" pairId={activeRarePair.id} pairSymbol={livePairLabel}
  price={livePrice} getAuthToken={headerAuthToken} onOpened={reloadTrades} />
```

## 2) Dashboard → Robinhood-light (mostly automatic)
Your dashboard shell uses theme tokens (`bg-void/obsidian`) and the dashboard PAGE uses
`var(--…)` 76×. So `styles/robinhood-theme.css` recolors nearly the whole dashboard just by
overriding the tokens — no page edits. Palette: light canvas (#F7F8FA), near-black text
(#0B0B0F), Robinhood green (#00C805), red (#FF5000), plus modern accents (violet #7C5CFC,
blue #2E7DFF).

Apply — import AFTER globals.css, once, in `app/layout.tsx`:
```ts
import './globals.css';
import '../styles/robinhood-theme.css';
```
It forces light regardless of the `.dark` toggle. Optional helper classes: `.rh-btn`
(green pill button), `.rh-tag-stock/crypto/fx` (category chips), `.rh-fit` (viewport-fit
column), `.rh-scroll-x`.

> Any screen that still looks dark is one that hardcodes hex instead of tokens (like the
> stock page did). Tell me which and I'll recolor it the same way I did the stock page.

## 3) Stock page recolored + fits without zoom
`app/dashboard/invest/asset/[symbol]/page.tsx` is fully recolored to the light palette
(surfaces, text, borders, green/red, violet/blue tags, white-on-color buttons — the
black-on-black toggle bug is fixed). It was already mobile-first (`max-w-2xl mx-auto`,
`pb-44`), so it fits at 100% zoom; the theme's viewport-fit guards (`overflow-x:hidden`,
`min-width:0`) keep it that way. This is the screen every stock link now funnels to.

## Verify
- Import the theme; open the dashboard → light with green accents, no zoom-out.
- Open any stock (e.g. /dashboard/invest/asset/AAPL) → light card, green Buy button,
  readable toggles, sticky Buy bar not overlapping content.
- Open an FX pair → the ticket renders light; place a buy with SL+TP on both a regular and
  a demo-fx pair.

## Build order
1–6 ✅  •  theme + recolor + FX regular ← here
Optional next: recolor any remaining hardcoded-hex screens; add PATCH to modify SL/TP on
open positions.
