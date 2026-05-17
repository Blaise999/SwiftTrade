# NOVATrADE — Full Feature Implementation Changelog

## Summary of All Changes (21 files modified/created)

---

## 1. EMAIL NOTIFICATION SYSTEM (9 new email types)

### `lib/email/config.ts` — Updated
- Added subject lines for: `withdrawalApproved`, `withdrawalRejected`, `botPurchase`, `tierUpgrade`, `investmentStarted`, `investmentMonthly`

### `lib/email/templates.ts` — 7 new templates appended
- **Withdrawal Rejected** — Shows rejection reason prominently in a red-highlighted box, includes all withdrawal details
- **Withdrawal Approved** — Green confirmation with withdrawal details
- **Bot Purchase** — Bot name, activation key, feature list
- **Tier Upgrade** — Tier name, level, price paid, bonus credit, unlocked features list
- **Investment Started** — Plan name, amount, return rate, duration, profit mode, start/maturity dates, projected return
- **Investment Monthly Report** — Current value, monthly profit, total profit, progress bar (month X of Y), maturity date, next credit date

### `lib/email/index.ts` — Complete rewrite
- All 17 sender functions now exported (11 existing + 6 new)
- New functions: `sendWithdrawalRejectedEmail`, `sendWithdrawalApprovedEmail`, `sendBotPurchaseEmail`, `sendTierUpgradeEmail`, `sendInvestmentStartedEmail`, `sendInvestmentMonthlyEmail`

---

## 2. EMAIL TRIGGER POINTS (where emails fire)

| Event | File | Trigger |
|-------|------|---------|
| User registers | `app/api/auth/[action]/route.ts` | After successful `registerUser()` |
| Deposit submitted | `app/api/deposits/route.ts` | After deposit row inserted |
| Deposit approved by admin | `app/api/admin/deposits/route.ts` | After balance credited |
| Withdrawal requested | `app/api/withdrawals/route.ts` | After withdrawal row inserted |
| Withdrawal approved | `app/api/admin/withdrawals/route.ts` | After status set to 'approved' |
| Withdrawal rejected | `app/api/admin/withdrawals/route.ts` | After status set to 'rejected' |
| Bot key redeemed | `app/api/bots/route.ts` | After bot access granted |
| Tier upgrade approved | `app/api/admin/tier-purchases/route.ts` | After tier activated + bonus credited |
| Investment started | `app/api/investments/enroll/route.ts` | After account created + ledger entry |
| Trade closed | `app/api/demo-fx/trades/route.ts` | After trade closed + balance returned |
| Monthly investment report | `app/api/investments/cron/route.ts` | On monthly profit accrual |

All emails are **fire-and-forget** (non-blocking) using `void` or try/catch wrappers.

---

## 3. INVESTMENT PROGRAM FIX

### `app/api/investments/cron/route.ts` — NEW FILE
**Call via:** `GET /api/investments/cron?key=CRON_SECRET` (daily via Vercel Cron or external scheduler)

**Accrual logic:**
- Runs daily, checks all `active` investment accounts
- Calculates months elapsed since `started_at` (30-day cycles)
- Compares against existing `profit_accrual` ledger entries to avoid double-crediting
- Monthly rate = `projected_return_pct / total_months`
- **Compound mode:** Profit added to `current_value_usd`
- **Monthly payout mode:** Profit credited directly to user's `balance_available`
- **Hybrid mode:** 50% compounded, 50% paid out
- Logs every accrual as an `investment_ledger_entries` row with metadata
- **Maturity handling:** When `now >= matures_at`, returns full `current_value_usd` to user balance, marks account as `matured`
- Sends monthly report email on each accrual
- Safe against admin manual interventions (checks existing accrual count)

### `supabase/migrations/investment_accrual_system.sql` — NEW FILE
- Creates `user_investment_accounts` table with `last_accrual_at` column
- Creates `investment_ledger_entries` table with `metadata` JSONB
- Adds `rejection_reason` and `admin_note` columns to `withdrawals`
- Creates indexes for performance
- Sets up RLS policies

---

## 4. ADMIN REJECTION IMPROVEMENTS

### `app/api/admin/withdrawals/route.ts`
- **Rejection reason is now MANDATORY** — returns 400 error if `rejection_reason` is missing or < 3 chars
- Rejection reason is stored in `withdrawals.rejection_reason`
- Rejection email automatically sent with the exact reason prominently displayed
- Approval email also sent on approve action

---

## 5. DEMO FX SESSION ENGINE FIXES

### Problem: Sessions ran past their set duration; cron lost continuity after admin sessions ended

### `lib/demo-fx/runtime.ts` — `resolvePairRuntimeState()` rewritten
- When a session expires (elapsed >= duration_ms), it's now **auto-completed** (status set to `completed`)
- Pair mode set to `'autopilot'` (not `'manual'`) so cron seamlessly resumes
- `active_session_id` cleared → cron's `ensurePairAutopilotFresh` immediately takes over
- **Price continuity guaranteed:** `current_bid`/`current_ask` are left intact from the session's last tick

### `app/api/admin/demo-fx/session-tick/route.ts`
- Session completion now sets pair mode to `'autopilot'` instead of `'manual'`

### `app/api/admin/demo-fx/sessions/route.ts`
- `stop` action → pair mode = `'autopilot'` (seamless cron handoff)
- `delete` action → pair mode = `'autopilot'`

### `app/api/admin/demo-fx/tick/route.ts`
- Scenario completion → pair mode = `'autopilot'`

### How the seamless handoff works:
1. Admin starts session → `pair.active_session_id = session.id`, `mode = 'session'`
2. Session ticks via admin dashboard (session-tick route)
3. Session reaches duration → `resolvePairRuntimeState` auto-completes it:
   - `session.status = 'completed'`
   - `pair.active_session_id = null`
   - `pair.mode = 'autopilot'`
   - `pair.current_bid/ask` = **exact last session price** (unchanged)
4. Next cron tick → sees `active_session_id = null` → `ensurePairAutopilotFresh` runs
5. Cron reads `current_bid/ask` (last session price) → generates next tick from there
6. **Zero gap, zero price jump** — perfect baton pass

---

## 6. FX PAIRS EXPANSION

### `app/dashboard/trade/fx/page.tsx`
**Before:** 14 FX pairs + 3 rare pairs = 17 total
**After:** 29 FX pairs + 21 rare/exotic pairs = 50 total

**New pairs added:**
- Minors: EUR/AUD, EUR/CAD, EUR/NZD, GBP/AUD, GBP/CAD, GBP/CHF, GBP/NZD, AUD/CAD, AUD/CHF, AUD/NZD, NZD/CAD, NZD/CHF, NZD/JPY, CAD/CHF
- Exotics: USD/MXN, USD/SGD, USD/HKD, USD/NOK, USD/SEK, USD/DKK, USD/PLN, USD/CZK, EUR/TRY, EUR/ZAR, EUR/PLN, EUR/NOK, EUR/SEK, GBP/ZAR, AUD/SGD, USD/THB, USD/INR, USD/CNH

### `lib/services/fx-trading-engine.ts`
- `FX_SPREADS` map expanded from 14 entries to 51 entries covering all new pairs

---

## 7. STOCK PAIRS EXPANSION

### `app/dashboard/trade/stocks/page.tsx`
**Before:** 14 stock symbols
**After:** 80 stock symbols across sectors

**New sectors/stocks added:**
- Technology: CRM, ORCL, ADBE, CSCO, IBM, UBER, SHOP, SQ, PYPL, PLTR, SNOW, NET, DDOG
- Cybersecurity: ZS, CRWD, PANW
- Semiconductors: AVGO, QCOM, TSM, MU, MRVL, ARM
- Finance: BAC, GS, MS, WFC, V, MA, AXP, BLK
- Healthcare: JNJ, UNH, PFE, ABBV, MRK, LLY
- Consumer/Retail: WMT, COST, NKE, SBUX, MCD, KO, PEP, PG
- Energy: XOM, CVX, COP
- Industrial: BA, CAT, DE, UPS, FDX
- Telecom: T, VZ, CMCSA
- EV/Clean: RIVN, LCID, ENPH
- Gaming: RBLX, EA, TTWO

Stock prices come from Alpaca API which resolves symbols dynamically — no backend changes needed.

---

## 8. VERCEL CRON CONFIGURATION

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/demo-fx/cron?key=YOUR_CRON_SECRET",
      "schedule": "*/10 * * * * *"
    },
    {
      "path": "/api/investments/cron?key=YOUR_CRON_SECRET",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Set `CRON_SECRET` in your environment variables.

---

## Files Changed Summary

| # | File | Action |
|---|------|--------|
| 1 | `lib/email/config.ts` | Modified — new subjects |
| 2 | `lib/email/templates.ts` | Modified — 7 new templates |
| 3 | `lib/email/index.ts` | Rewritten — 6 new sender functions |
| 4 | `app/api/auth/[action]/route.ts` | Modified — welcome email |
| 5 | `app/api/deposits/route.ts` | Modified — deposit email |
| 6 | `app/api/admin/deposits/route.ts` | Modified — deposit approved email |
| 7 | `app/api/withdrawals/route.ts` | Modified — withdrawal request email |
| 8 | `app/api/admin/withdrawals/route.ts` | Modified — mandatory reason + emails |
| 9 | `app/api/bots/route.ts` | Modified — bot purchase email |
| 10 | `app/api/admin/tier-purchases/route.ts` | Modified — tier upgrade email |
| 11 | `app/api/investments/enroll/route.ts` | Modified — investment started email |
| 12 | `app/api/investments/cron/route.ts` | **NEW** — monthly accrual + email |
| 13 | `app/api/demo-fx/trades/route.ts` | Modified — trade email on close |
| 14 | `lib/demo-fx/runtime.ts` | Modified — session handoff fix |
| 15 | `app/api/admin/demo-fx/session-tick/route.ts` | Modified — autopilot handoff |
| 16 | `app/api/admin/demo-fx/sessions/route.ts` | Modified — autopilot on stop/delete |
| 17 | `app/api/admin/demo-fx/tick/route.ts` | Modified — autopilot on complete |
| 18 | `app/dashboard/trade/fx/page.tsx` | Modified — 50 FX pairs |
| 19 | `app/dashboard/trade/stocks/page.tsx` | Modified — 80 stocks |
| 20 | `lib/services/fx-trading-engine.ts` | Modified — 51 spread entries |
| 21 | `supabase/migrations/investment_accrual_system.sql` | **NEW** — DB migration |
