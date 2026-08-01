# SwiftTrade — drop 2: crypto wired + dashboard total + Shield Risk Meter

Builds on drop 1 (the spine). Everything here reads/writes the ONE ledger:
`users.balance_available` for cash, `crypto_positions` / `positions` for holdings.

## What's in this drop
- `app/api/ledger/net-worth/route.ts` — UPDATED: equities hook is now LIVE. Reads
  both `crypto_positions` and the `positions` table `/api/invest/order` writes, so
  stocks + crypto fold into one total. (Replaces drop-1 version.)
- `app/api/crypto/trade/route.ts` — NEW. Balance-safe crypto buy/sell that moves the
  same ledger. Mirrors `/api/invest/order` exactly so crypto == equities behaviour.
- `lib/ledger/valuation.ts` — the spine (unchanged; included so this drop is complete).
- `components/dashboard/useNetWorth.ts` — client hook, polls the net-worth endpoint.
- `components/dashboard/NetWorthCard.tsx` — the headline total, reads the spine.
- `components/dashboard/ShieldRiskMeter.tsx` — the green/yellow/red gauge, computed
  from live positions. Honest heuristic (concentration + crypto weight + drawdown).

## Wire-up
1. **Dashboard total** — in `app/dashboard/page.tsx`, drop in
   `<NetWorthCard userId={userId} />` where the total currently renders, and
   `<ShieldRiskMeter userId={userId} />` on the Shield/home screen. Get `userId` from
   your existing auth/store (the same value you send as `x-user-id` elsewhere).
2. **Crypto trade screen** — point `app/dashboard/trade/crypto` buy/sell at
   `POST /api/crypto/trade` with `{ symbol, side, amountType:'notional', amount, price }`,
   where `price` is the live price you're already displaying. On success, call the
   NetWorth hook's `refresh()` (or let the 15s poll pick it up) and the whole
   dashboard updates from the same source.

## "Feels instant" (optimistic UI)
The route settles synchronously and returns fast, so the smooth-UX version is:
show `processing` immediately on tap → await the POST → flip to `settled` + `refresh()`.
For swap/bridge later, we insert a worker delay between those two states; the pattern
is identical, so the UI code you write now carries straight over.

## Still ahead (build order)
3. ✅ crypto buy/sell + dashboard total + risk meter  ← this drop
4. Reconcile the stocks screen onto the unified valuation (route already writes `positions`)
5. SwiftBridge → worker settles a credit into `balance_available`
6. FX (last) on the demo-fx engine
