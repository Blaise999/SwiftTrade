# SESSION ENGINE V2 — Admin & Architecture Guide

## 1. DIAGNOSIS (What was wrong)

The rare pair system had 7 competing price sources that could all write to the chart at once:

| Source | Problem |
|--------|---------|
| OANDA candles via `/api/market/fx/candles` | `loadChart()` didn't fully exit when rareMode=true due to race conditions |
| WebSocket gateway ticks | WS close was async, messages could arrive after `closeWs()` was called |
| SessionStorage tick cache (`novatrade:fx:ticks:*`) | Keyed by symbol, not pair_id — normal EUR/USD ticks could bleed into rare mode |
| SessionStorage candle cache | Same key collision problem |
| `generateSyntheticCandlesFx()` | Random noise candles shown as fallback, causing price jumps |
| `chartPointsToCandles()` from `demo_fx_price_log` | Sparse log entries produced gapped candles |
| `pushPriceToServer()` | Wrote OANDA prices to trades table, overwriting demo prices |

**Result**: Chart flickered between real OANDA prices, cached prices, synthetic random prices, and demo prices — all within the same render cycle.

## 2. ARCHITECTURE (Session Engine V2)

### Single Source of Truth
```
GET /api/demo-fx/feed?pair_id=X&tf=1m&after_seq=N
```
This is the ONLY endpoint the FX page calls for rare pairs. It returns:
- `pair`: current_bid, current_ask, seq, mode, active_session_id
- `session`: type, progress, elapsed/duration
- `candles[]`: server-built OHLC candles from `demo_fx_candles` table
- `latest_ticks[]`: recent ticks for live candle updating

### Tick Flow
```
Admin clicks "Auto-Tick ON" (or calls POST /api/admin/demo-fx/sessions {action:'tick'})
  → Session engine computes elapsed_ms and progress (0→1)
  → Interpolates price based on session_type (bullish/bearish/range/reversal/crash/spike)
  → Adds controlled micro-noise (volatility param)
  → Writes tick to demo_fx_ticks (with seq)
  → Upserts 1m + 5m candle in demo_fx_candles (proper OHLC)
  → Updates pair current_bid/ask/seq
  → Marks-to-market all open trades
  → Auto-closes on SL/TP/liquidation
  → Returns results
```

### Stale Rejection
- Every tick increments `seq` on both the tick row and the pair row
- Client tracks `rareSeqRef` — ignores updates where server seq <= local seq
- On session change (`active_session_id` differs), client destroys chart completely

### Chart Isolation
When `rareMode=true`:
- WebSocket is disconnected (was already there, now with proper cleanup)
- `loadChart()` returns immediately (was already there)
- SessionStorage caches for the pair are cleared
- Chart is destroyed and recreated on mode switch
- NO synthetic candles, NO OANDA candles, NO tick cache
- ONLY server candles from `/api/demo-fx/feed`

## 3. SQL MIGRATION

File: `supabase/migrations/session_engine_v2.sql`

New tables:
- `demo_fx_sessions` — session type, duration, start/target prices, volatility
- `demo_fx_ticks` — every price tick with seq + session_id
- `demo_fx_candles` — pre-aggregated OHLC candles by timeframe

Altered tables:
- `demo_fx_pairs` — added `seq`, `active_session_id`
- `demo_fx_trades` — added `session_id`

## 4. SESSION FLOW

1. Admin creates session: POST /api/admin/demo-fx/sessions `{pair_id, session_type:'bullish', duration_ms:300000, target_bid, target_ask}`
2. Admin starts session: POST /api/admin/demo-fx/sessions `{action:'start', session_id}`
   - Pair switches to mode='session', initial tick written
3. Admin enables auto-tick (1s interval): POST `{action:'tick'}` every ~1s
   - Engine interpolates price, writes tick, upserts candles, updates trades
4. Session completes when elapsed >= duration
   - Pair switches back to mode='manual'

## 5. WALLET FLOW

- Admin sets per-user wallets in Admin → User Wallets page
- Each wallet has: user_id, currency, network, address, label
- Deposit page: fetches `user_deposit_wallets` for the logged-in user
- Shows user-specific wallets first
- Falls back to global platform wallets only if user has no wallets

## 6. ACCEPTANCE CHECKLIST

### Rare Pairs
- [ ] Select a rare pair → chart shows SESSION label, not CACHE/SIM/OANDA
- [ ] Start session on admin → student chart starts building candles from ticks
- [ ] Candles have proper OHLC (open=first, high=max, low=min, close=last)
- [ ] Switch from rare to normal pair → chart clears completely, then loads OANDA data
- [ ] Switch from normal to rare pair → chart clears completely, then loads session data
- [ ] No price glitching between different sources
- [ ] Student opens trade → balance deducted by investment amount
- [ ] Admin moves price → student PnL updates within 1-2s
- [ ] Student closes trade → balance credited with investment + PnL
- [ ] SL/TP auto-close works when tick engine processes matching price
- [ ] Session completes → pair returns to manual mode

### Wallets
- [ ] Admin sets per-user BTC wallet → student deposit page shows BTC wallet
- [ ] Admin sets per-user USDT-TRC20 → student deposit page shows it
- [ ] No per-user wallets → falls back to global platform wallets
- [ ] Wallet addresses copy correctly

### Normal FX (regression check)
- [ ] EUR/USD chart loads normally with OANDA candles
- [ ] WebSocket ticks work
- [ ] Normal trades open/close correctly
- [ ] Balance updates correctly for normal trades
