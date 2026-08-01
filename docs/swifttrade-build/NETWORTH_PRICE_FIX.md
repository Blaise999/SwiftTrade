# SwiftTrade — fix: net-worth priced stocks at $0

## What was wrong
The drop-2 net-worth route fetched ALL prices from `/api/market/prices`, which is your
CRYPTO feed (CoinGecko). It doesn't know AAPL/TSLA, so every stock holding came back
unpriced → valued at $0 in the total. Since the Robinhood-style invest screen
(`app/dashboard/invest/asset/[symbol]`) already writes real stock positions to the
`positions` table via `/api/invest/order`, those holdings existed but showed as $0.

## The fix
This route (drop this in, replaces the drop-2 version) splits holdings by asset class and
prices each from the correct feed:
- crypto → `/api/market/prices`
- stocks / ETFs → `/api/market/stocks/quotes`  (returns `{ SYM: { price } }`)
…then merges into one price map. Both feeds are fetched in parallel.

## Good news on stocks (step 4)
Your real stock screen is ALREADY on the unified ledger — the invest asset page POSTs to
`/api/invest/order` (writes `positions` + `balance_available`). So nothing to patch there;
this price fix is all that was needed for stocks to show correctly in net worth.

The `trade/stocks` chart terminal is the OTHER screen — it trades in a client zustand store
and is NOT ledger-backed. Recommend retiring or relabeling it so a demo never shows two
stock screens with different balances. (The `placeEquityOrder` helper from drop 3 can point
it at the ledger if you'd rather keep it.)

## Verify
Buy a share of AAPL on the invest screen → GET `/api/ledger/net-worth` (x-user-id header)
→ confirm the AAPL position shows a non-zero `valueUsd` and the total includes it.
