# SwiftTrade — build integration guide

This is your full project with all the work merged in. Detailed per-drop notes are in
`docs/swifttrade-build/`. Quick map of what's new and what (if anything) you still wire.

## Already wired for you
- `app/layout.tsx` now imports `styles/theme.css` (dual-mode light/dark) after globals, and
  your existing no-flash script (`st-theme` key) drives it. `components/ThemeToggle.tsx` uses
  the same key — drop `<ThemeToggle />` into your top bar to expose the switch.
- Stock links funnel to the invest screen: `app/dashboard/trade/stocks` and `app/stocks` now
  redirect there.
- `app/dashboard/invest/asset/[symbol]/page.tsx` is token-based, so it follows dark/light.

## New building blocks (drop into screens where noted in the docs)
- Ledger spine: `lib/ledger/valuation.ts`, `app/api/ledger/net-worth/route.ts`
- Crypto trade + orders: `app/api/crypto/trade/route.ts`, `lib/ledger/orders.ts`
- Dashboard: `components/dashboard/NetWorthCard.tsx`, `ShieldRiskMeter.tsx`, `DemoBadge.tsx`,
  `useNetWorth.ts`
- SwiftBridge: `app/api/bridge/settle/route.ts`, `app/api/bridge/status/route.ts`,
  `components/dashboard/useBridgeStatus.ts`
- FX ticket + SL/TP: `components/trade/FxOrderTicket.tsx`, `lib/fx/sltp.ts`
- Theme + toggle: `styles/theme.css`, `components/ThemeToggle.tsx`

## Test account + SQL
- `sql/00_introspect.sql` — run first, confirms your live columns.
- `sql/seed_jeff_janice.sql` — creates the test login jeff.janice@swifttrade.test / Test1234!

## Known schema items to confirm (see docs/swifttrade-build/DROP8_NOTES.md)
- `transactions` inserts should use `metadata`, not `reference_type`.
- `crypto_positions` column set (`avg_buy_price` vs `average_price`) — net-worth tolerates both.
- equities `positions` table may be missing — introspection will tell you.
