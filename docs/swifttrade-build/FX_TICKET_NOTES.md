# SwiftTrade — drop 5: FX order ticket (arranged) + SL/TP made usable

## First, the good news about SL/TP
The logic already exists end-to-end — you don't need it built, you need it usable:
- `POST /api/demo-fx/trades` accepts `stop_loss` / `take_profit` and rejects wrong-side values
  ("Buy stop loss must be below entry", etc.).
- The server reprice engine (`lib/demo-fx/reprice-helpers`) auto-closes trades that hit SL,
  TP, or liquidation, and returns balance — with the right `close_reason`.

What was missing was on the screen: SL/TP was buried in a cramped 320px panel, had no risk
preview, and no client-side side check — so users hit confusing 400s and had to zoom out to
see the controls. This drop fixes the arrangement.

## What's in this drop
- `lib/fx/sltp.ts` — pure helpers: pip⇄price conversion, correct-side validation (mirrors the
  server), and risk/reward/liquidation math.
- `components/trade/FxOrderTicket.tsx` — the entire order entry in one compact, always-visible
  column. Buy/Sell, investment (with chips), leverage, SL/TP as **pips or price**, a live
  Risk / Reward / R:R / Liquidation strip, and a confirm modal. Validates SL/TP on the correct
  side BEFORE submit. Posts the same body your page already sends
  (`pair_id, direction, investment, multiplier, stop_loss, take_profit`).

## Arrange the FX page (no more zoom-out)
The page root is `h-[calc(100vh-4rem)] flex flex-col overflow-hidden`, with a right panel
`hidden lg:flex w-80 xl:w-96 overflow-y-auto`. The "zoom out to trade" pain is that the order
controls + positions all stack in that scrolling panel, pushing Buy/Sell below the fold.

Fix — split the right panel into two zones so the ticket is always visible and only positions
scroll:
```tsx
<div className="hidden lg:flex flex-col w-80 xl:w-96 border-l border-white/10 bg-[#0F1D33] min-h-0">
  {/* order ticket — fixed, always visible */}
  <div className="p-3 border-b border-white/10">
    <FxOrderTicket
      pairId={activeRarePair?.id ?? currentPairId}
      pairSymbol={livePairLabel}
      price={livePrice}                 // your current mid/last price variable
      getAuthToken={headerAuthToken}
      onOpened={() => { loadNormalTrades(); loadRareMode(); refreshUser(); }}
    />
  </div>
  {/* positions — the ONLY thing that scrolls */}
  <div className="flex-1 min-h-0 overflow-y-auto">
    {/* your existing open-positions list */}
  </div>
</div>
```
Replace the cramped inline order markup (the investment `−/＋`, the rose/green pip buttons,
the notional/pair rows — roughly lines ~2551–2635) with the `<FxOrderTicket/>` above.

Mobile: drop the SAME `<FxOrderTicket/>` inside the bottom sheet (the `lg:hidden` block
around line ~2689) so phone users get the identical clean ticket instead of the tall stack.

Result: at 100% zoom, Buy/Sell + investment + leverage + SL/TP + Place Order all fit without
scrolling; only the positions list scrolls. No zoom-out.

## Props
- `pairId` — the pair to trade (rare pair id, or your normal pair id)
- `pairSymbol` — e.g. `"EUR/USD"` (drives pip size: JPY pairs use 0.01, else 0.0001)
- `price` — the live entry price you already display
- `getAuthToken` — pass your `headerAuthToken`
- `onOpened` — refresh trades + balance after a fill
- `endpoint` — defaults to `/api/demo-fx/trades`. If you also want the ticket on the "normal
  FX" path (which posts to `/api/trades`), pass `endpoint="/api/trades"` — tell me and I'll
  confirm that route's SL/TP field names so it matches.

## Optional next: modify SL/TP on an OPEN position
Right now SL/TP is set at open. There's a `PUT /api/demo-fx/trades` for closing, but no
endpoint to change SL/TP on a live trade. If you want "drag to move SL/TP" on open positions,
I can add a small `PATCH` that updates `stop_loss`/`take_profit` (re-running the same side
validation) — say the word.

## Build order
1–5 ✅ (spine · dashboard · crypto · stocks · bridge · theme/fit)
6. ✅ FX order ticket + SL/TP usable ← this drop
   ⏭ optional: modify-SL/TP-on-open endpoint; retire/relabel remaining terminal bits
