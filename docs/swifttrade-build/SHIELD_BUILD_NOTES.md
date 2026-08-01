# SwiftTrade — wiring the spine (start-to-finish)

## The one rule
**One source of truth for cash: `users.balance_available` (USD).**
Everything else is a *view* of it. Total net worth is always:

    Total Net Worth (USD) = balance_available + balance_bonus + Σ(position.qty × live price)

If a screen shows a balance that doesn't come from this formula, that screen is a bug.

## Files in this drop
- `lib/ledger/valuation.ts` — pure net-worth math (the spine). No I/O, easy to trust.
- `app/api/ledger/net-worth/route.ts` — assembles the spine from Supabase + your existing
  `/api/market/prices` feed. Call this from the dashboard, wallet, and Shield Risk Meter.
- `components/dashboard/DemoBadge.tsx` — persistent "Demo · simulated balances" marker.

## Wire-up (3 steps)
1. **Badge everywhere.** In `app/dashboard/layout.tsx`, import and render `<DemoBadge />`
   once, outside the page content. It now shows on every dashboard screen.
   Add `NEXT_PUBLIC_DEMO_MODE=true` to `.env` (set to `false` to hide it later).

2. **Dashboard total reads the spine.** In `app/dashboard/page.tsx`, replace the
   client-store total with a fetch to `/api/ledger/net-worth` (send `x-user-id`).
   Use `totalNetWorthUsd`, `cashUsd`, `positions`, `totalUnrealizedPnlUsd`.

3. **Fold in equities.** Uncomment the PHASE-2 HOOK in `net-worth/route.ts` and point it
   at the table `/api/invest/order` already writes to. Now stocks + crypto share one number.

## Build order (what we do next, in sequence)
1. ✅ Spine: valuation service + net-worth endpoint + demo badge  ← this drop
2. Dashboard total + Shield Risk Meter both read the spine
3. Crypto buy/sell → route through the shared initiate→worker→settle flow (mirror
   `/api/invest/order`, which already deducts from `balance_available` correctly)
4. Stocks → reconcile the existing route onto the unified valuation (the hook above)
5. SwiftBridge → worker "settles" the credit into `balance_available`; dashboard reflects it
6. FX (last) → built on the existing demo-fx engine

## The "feels instant" pattern (use for every swap/buy/sell/bridge)
- Client taps action → optimistic UI shows `processing`
- API writes an intent row + returns immediately
- A worker (Supabase edge fn or your `/api/cron/*` tick) settles it against the ledger
  using a **real live price**, then marks it `settled`
- Client polls or subscribes → flips to `settled`

Because the ledger genuinely moves against a real price, this is an honest simulation:
the demo does what it says it does. The only thing that isn't real is that the dollars
aren't licensed/custodied yet — which the badge states plainly.
