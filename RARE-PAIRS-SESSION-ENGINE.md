# RARE PAIRS SESSION ENGINE — ADMIN GUIDE + TEST CHECKLIST

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│  ADMIN creates session:                                         │
│    pair_id, type(bullish/bearish/...), duration, start→target   │
│                         ↓                                       │
│  SESSION ENGINE (tick every 1s via Admin "Auto-Tick"):          │
│    1. Compute progress = elapsed / duration                     │
│    2. Generate bid/ask from session_type curve + noise           │
│    3. Write tick → demo_fx_ticks (pair_id, session_id, seq)     │
│    4. Upsert candle → demo_fx_candles (1m, 5m buckets)          │
│    5. Update pair → demo_fx_pairs.current_bid/ask + seq         │
│    6. Process trades → SL/TP/liquidation check                  │
│    7. Return balance on trade close                             │
│                         ↓                                       │
│  USER FX PAGE polls every 1.5s:                                 │
│    1. GET /api/demo-fx/ticks?pair_id=X&since_seq=N              │
│       → current bid/ask, session info, new ticks                │
│    2. GET /api/demo-fx/candles?pair_id=X&tf=1m&session_id=Y     │
│       → pre-built OHLC candles from ticks                       │
│    3. Render chart from candles (NO other source)               │
│    4. Display price from pair state (NO WS, NO OANDA)           │
└─────────────────────────────────────────────────────────────────┘
```

## SESSION FLOW

1. Admin opens `/admin/demo-fx`
2. Clicks "New Session" → picks pair, type, duration, start/target prices
3. Clicks "Create & Start" → session goes to `running` status
4. **CRITICAL**: Admin clicks "Auto-Tick" to turn on the tick engine (ticks every 1s)
5. Session engine generates prices → writes ticks → builds candles → updates pair
6. Students see price updates + candles on their FX page within ~1.5s
7. Session auto-completes when elapsed >= duration
8. Admin can manually Stop anytime

## WHAT FIXED THE GLITCHING

| Old Problem | Fix |
|---|---|
| Chart read from price_log + synthetic fallback + WS + OANDA | Chart reads ONLY from `demo_fx_candles` (session engine builds them) |
| Price came from multiple sources | Price comes ONLY from `demo_fx_pairs.current_bid/ask` |
| No session isolation | Every tick has `session_id` + `seq` |
| Stale cache bleeding | Chart destroyed + cache cleared on pair/session switch |
| Manual override could conflict with scenario | Manual override blocked while session is running |
| Candles were 1-point-per-entry | Candles properly bucket ticks into 1m/5m intervals with real OHLC |

## SQL MIGRATION

Run `supabase/migrations/demo_fx_session_engine.sql` in Supabase SQL editor.

This creates:
- `demo_fx_sessions` — session config + lifecycle
- `demo_fx_ticks` — every tick emitted (pair_id, session_id, seq)
- `demo_fx_candles` — pre-aggregated OHLC candles
- `user_deposit_wallets` — per-user wallet addresses
- Adds `seq`, `active_session_id` to `demo_fx_pairs`
- Adds `session_id` to `demo_fx_trades`
- Updates mode constraint to allow 'session'

## WALLET FLOW

1. Admin goes to `/admin/wallets` → finds user → Edit
2. Under "Per-Currency Deposit Wallets", adds BTC/ETH/USDT addresses per network
3. User's Deposit page (`/dashboard/deposit`) auto-fetches their assigned wallets
4. Per-user wallets show first → fallback to global only if none assigned
5. Same logic for Tier Checkout page

## ACCEPTANCE CHECKLIST

### Session Engine
- [ ] Run SQL migration successfully
- [ ] Create a session from admin panel (bullish, 5min, USD/TRY)
- [ ] Turn on Auto-Tick → see tick count increment
- [ ] Pair price updates on admin panel
- [ ] Session completes automatically after duration

### Chart & Price (Student Side)
- [ ] Select rare pair → chart shows "SESSION" label
- [ ] Candles appear and grow as ticks arrive
- [ ] Price in header updates every ~1.5s
- [ ] Switch to normal pair → chart switches to OANDA/live (no rare data bleed)
- [ ] Switch back to rare pair → chart shows session data (no stale normal data)
- [ ] Stop session → chart shows "Waiting for session" (no synthetic candles)

### Trading
- [ ] Open buy trade on rare pair → balance deducts
- [ ] Price moves → PnL updates in real-time
- [ ] Close trade → balance returns (investment + PnL)
- [ ] SL/TP triggers correctly when price crosses threshold
- [ ] Admin can force-close trade from admin panel

### No Glitching
- [ ] No WS connection attempts when on rare pair
- [ ] No OANDA candle fetches when on rare pair
- [ ] No sessionStorage cache reads when on rare pair
- [ ] Price doesn't jump between sources
- [ ] Chart doesn't flash/reset unexpectedly
- [ ] Switching pairs doesn't show stale candles

### Wallets
- [ ] Admin sets per-user wallet in `/admin/wallets`
- [ ] User sees their wallet on Deposit page (not global)
- [ ] User sees their wallet on Tier Checkout page
- [ ] If no per-user wallet, global wallets show as fallback

### Manual Override
- [ ] Manual override blocked while session is running (edit button hidden)
- [ ] Stop session → manual override available
- [ ] Manual override writes to ticks + updates pair price

## FILE MAP

```
NEW/MODIFIED FILES:
supabase/migrations/demo_fx_session_engine.sql     — SQL migration
lib/demo-fx/session-engine.ts                       — Tick generation + candle building
app/api/admin/demo-fx/sessions/route.ts             — Session CRUD + start/stop
app/api/admin/demo-fx/session-tick/route.ts         — Tick heartbeat engine
app/api/admin/demo-fx/trades/route.ts               — Admin list all trades
app/api/admin/demo-fx/close-trade/route.ts          — Admin force-close trade
app/api/demo-fx/pairs/route.ts                      — User pairs (session-enriched)
app/api/demo-fx/candles/route.ts                    — User candles from session
app/api/demo-fx/ticks/route.ts                      — User live ticks + state
app/admin/demo-fx/page.tsx                          — Admin session control panel
app/dashboard/trade/fx/page.tsx                     — FX page (rare pair section rewritten)
app/dashboard/deposit/page.tsx                      — Per-user wallet support
app/dashboard/tier/checkout/page.tsx                — Per-user wallet support
```
