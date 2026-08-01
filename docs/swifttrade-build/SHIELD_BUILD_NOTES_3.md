# SwiftTrade — drop 3: stocks reconciled + SwiftBridge worker

Everything still flows through the ONE ledger: `users.balance_available` (cash) and
`positions` / `crypto_positions` (holdings). The net-worth endpoint from drop 1/2 already
reads all of it — these changes make stocks and bridge actually WRITE it.

## Step 4 — Stocks onto the unified valuation
Your stocks screen (`app/dashboard/trade/stocks/page.tsx`) executes trades through the
client store (`executeStockBuy` / `executeStockSell` from `useTradingAccountStore`). That
store never touches `balance_available`, so those trades are invisible to net worth.

Fix: use `lib/ledger/orders.ts → placeEquityOrder()` instead.
- **Buy handler** (around line ~975, where `executeStockBuy` is called): replace with
  ```ts
  const res = await placeEquityOrder({
    userId, symbol: selectedSymbol, assetType: 'stock',
    side: 'buy', amountType: orderMode === 'dollars' ? 'notional' : 'qty',
    amount: orderMode === 'dollars' ? dollarAmount : effectiveShares,
    price: safeAsk,
  });
  if (res.ok) refreshNetWorth();   // your useNetWorth().refresh
  ```
- **Sell handler** (around line ~1010, `executeStockSell`): same call with `side:'sell'`,
  `amountType:'qty'`, `amount: sellQty`, `price: safeBid`.

Now stock buys/sells hit `positions` + `balance_available` — identical to crypto — and the
dashboard total (drop 2) reflects them automatically. Same helper has `placeCryptoOrder()`
so both screens share one path.

## Step 5 — SwiftBridge worker (real processing, feels instant)
Bridge already had a manual admin-approve that credits via the `credit_user_usd` RPC. The
worker reuses that exact credit path so money lands one way only.

Files:
- `app/api/bridge/settle/route.ts` — the worker.
  - **Cron tick:** `GET /api/bridge/settle?key=CRON_SECRET` advances every open DEMO request
    one stage each call (admin → payment → verification → completed) and credits on the last
    hop. Point your existing external scheduler at it every ~10s (same setup as `/api/cron/run`).
  - **Settle-now:** `POST /api/bridge/settle { request_id }` completes + credits ONE request
    instantly — the demo money shot.
  - Gated by `NEXT_PUBLIC_DEMO_MODE`; never auto-credits when demo is off. Won't double-credit
    (skips anything already `completed`).
- `app/api/bridge/status/route.ts` — user-facing `GET ?id=` (owner-scoped) so the client can
  poll a request's status.
- `components/dashboard/useBridgeStatus.ts` — polls that endpoint, shows the stage copy
  ("Reviewing… → Confirming… → Verifying… → Completed"), and fires `onCompleted(credited)`
  once so you can call `refreshNetWorth()` the instant funds land.

Wire-up on the bridge screen (`app/dashboard/bridge`):
```ts
const { label, isDone, credited } = useBridgeStatus(requestId, userId, {
  onCompleted: () => refreshNetWorth(),
});
// show `label` as the processing status; on isDone, toast `credited`
```
For live demos with the cron running, a new request walks itself to completed in ~30s. To
make it instant on stage, call the settle-now POST behind an admin/demo button.

## Build order
1. ✅ spine (valuation + net-worth + demo badge)
2. ✅ dashboard total + Shield Risk Meter
3. ✅ crypto buy/sell on the ledger
4. ✅ stocks reconciled onto the ledger   ← this drop
5. ✅ SwiftBridge worker + status + credit ← this drop
6. ⏭ FX (last) — on the existing demo-fx engine

## Reminder
Everything credits a simulated ledger and the Demo badge says so. That's the honest posture:
the flows genuinely execute (states advance, balances move against real prices) — the only
thing not real is that the dollars aren't licensed/custodied yet.
