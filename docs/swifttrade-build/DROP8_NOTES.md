# SwiftTrade — drop 8: test account + SQL + schema corrections

## Read me first — honest scope
You asked for a lot in one go (balance logic, SwiftBridge, all Shield features, deposit/
withdraw, full responsiveness + no lag, full zip + full SQL, and a seeded account). Here's
what I can and can't truthfully do from here:

- **I can't reach your Supabase**, so I can't create Jeff Janice *in* your DB. Instead you
  get a seed you run yourself (below). That IS the test account.
- **I can't verify "no lag / full responsiveness"** without running your app. The theme
  from drop 7 already ships the viewport-fit + responsive guards; the feel you confirm.
- Reading your schema files, I found your repo has **conflicting schema versions** and some
  of my earlier drops wrote columns that don't exist in your live DB. Those are corrected
  here. Producing a guaranteed "full SQL" for the whole app blind isn't safe — so run
  `00_introspect.sql`, paste me the output, and I'll finish anything that doesn't match.

## The test account
1. Run `sql/00_introspect.sql` — paste me the result if anything below errors.
2. Run `sql/seed_jeff_janice.sql`. It's idempotent and **adapts to your real columns**.
   Login: **jeff.janice@swifttrade.test / Test1234!**
   Loaded with: $25k available + $500 bonus (+$1.5k pending / $40k deposited if those
   columns exist), Shield on, BTC/ETH positions, AAPL/TSLA (if the `positions` table
   exists), a confirmed deposit, a completed withdrawal, and two SwiftBridge requests
   (one completed, one in progress).
   - If the `auth.users` insert errors (Supabase versions vary), create the user once in
     Dashboard → Authentication → Add user, copy its UID into `v_uid`, and re-run.

## Schema bugs I found and fixed
- **bridge_requests columns.** Real columns are `estimated_usd` / `final_credit_usd` /
  `completed_at` — NOT `estimated_credit_usd` / `credited_amount_usd`. Fixed in
  `app/api/bridge/settle/route.ts` (replaces the drop-3 version). Your `bridge/status`
  route from drop 3 must also change its SELECT to `estimated_usd, final_credit_usd`.
- **transactions columns.** Your table has `reference_id` + `metadata`, NOT `reference_type`.
  The `transactions` inserts in the drop-2 crypto route and drop-3 bridge worker were
  wrapped in try/catch so they failed silently — change them to:
  `{ user_id, type, amount, currency, balance_after, description, metadata, status }`.
- **crypto_positions columns.** One schema uses `avg_buy_price`, another `average_price`.
  The corrected `app/api/ledger/net-worth/route.ts` now `select('*')` and reads
  `avg_buy_price ?? average_price`, so it works either way. Your drop-2 crypto **trade**
  route hardcodes `average_price`/`total_cost_basis` — if introspection shows `avg_buy_price`,
  tell me and I'll ship a tolerant version.
- **`positions` (equities) table may not exist.** It's in no schema file. If
  introspection shows it missing, your stock buys are failing — I'll give you the
  `CREATE TABLE` to add it (columns: user_id, symbol, asset_type, quantity, avg_entry_price,
  market_value).

## Still ahead (the honest to-do, in verifiable slices)
Once introspection confirms the live schema, I'll do these so each can't silently mismatch:
1. Deposit + withdraw request→approve→ledger flow, on your real `deposits`/`withdrawals`.
2. Shield Mode features wired to `users.shield_mode` + `crypto_positions.shield_*`.
3. A balance-integrity pass (single ledger, atomic RPC for deduct/credit).
4. Responsiveness sweep of the remaining screens (wallet, crypto, bridge) + the token
   recolor so they're dual-mode too.

Paste the introspection output and I'll take the next slice.
