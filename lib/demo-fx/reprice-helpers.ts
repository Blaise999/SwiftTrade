// lib/demo-fx/reprice-helpers.ts
// ============================================================================
// SHARED SERVER HELPERS FOR DEMO FX PRICE UPDATES
// ============================================================================
// Used by:
//   - /api/admin/demo-fx/pairs          (POST - admin edits pair)
//   - /api/admin/demo-fx/price-override (POST - admin manual override)
//   - /api/admin/demo-fx/session-tick   (POST - session engine tick)
//
// These helpers ensure that EVERY price change:
//   1. Inserts a tick into demo_fx_ticks
//   2. Upserts candles in demo_fx_candles (1m + 5m)
//   3. Reprices all open trades on the pair
//   4. Auto-closes trades that hit SL/TP/liquidation
//   5. Returns investment+PnL to user balance on close
// ============================================================================

import { calculateFloatingPnL, checkSLTP, calculateFinalPnL } from './pnl';
import { buildCandleUpdates, type CandleRow } from './session-engine';

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface RepriceResult {
  trade_id: string;
  user_id: string;
  floating_pnl: number;
  current_price: number;
  closed: boolean;
  close_reason?: string;
  exit_price?: number;
  final_pnl?: number;
  return_amount?: number;
}

// ─── INSERT TICK + UPSERT CANDLES ───────────────────────────────────────────

/**
 * Append a tick to demo_fx_ticks and upsert candles in demo_fx_candles.
 * Works for both session mode (sessionId != null) and manual mode (sessionId = null).
 */
export async function appendDemoTickAndCandles(
  supabase: any,
  pairId: string,
  sessionId: string | null,
  bid: number,
  ask: number,
  seq: number,
  source: 'manual' | 'session' | 'system' = 'manual'
): Promise<{ tickOk: boolean; candleErrors: string[] }> {
  const now = new Date();
  const nowIso = now.toISOString();
  const mid = Number(((bid + ask) / 2).toFixed(8));
  const errors: string[] = [];

  // 1. Insert tick
  const { error: tickErr } = await supabase.from('demo_fx_ticks').insert({
    pair_id: pairId,
    session_id: sessionId || null,
    bid,
    ask,
    mid,
    source,
    seq,
    ts: nowIso,
  });

  if (tickErr) {
    console.error('[reprice-helpers] tick insert failed:', tickErr.message);
    return { tickOk: false, candleErrors: [tickErr.message] };
  }

  // 2. Build candle updates for 1m and 5m
  const candleRows: CandleRow[] = buildCandleUpdates(
    {
      pair_id: pairId,
      session_id: sessionId || '',
      bid,
      ask,
      mid,
      source,
      seq,
      ts: nowIso,
    },
    ['1m', '5m']
  );

  // Override session_id to actual null for manual mode
  for (const cr of candleRows) {
    if (!sessionId) {
      cr.session_id = null;
    }
  }

  // 3. Upsert each candle row
  for (const cr of candleRows) {
    try {
      // Build query to find existing candle
      let findQ = supabase
        .from('demo_fx_candles')
        .select('id, open, high, low, close, tick_count')
        .eq('pair_id', cr.pair_id)
        .eq('timeframe', cr.timeframe)
        .eq('bucket_start', cr.bucket_start);

      // Handle NULL session_id (PostgreSQL NULL != NULL)
      if (cr.session_id) {
        findQ = findQ.eq('session_id', cr.session_id);
      } else {
        findQ = findQ.is('session_id', null);
      }

      const { data: existing, error: findErr } = await findQ.maybeSingle();

      if (findErr) {
        errors.push(`find candle ${cr.timeframe}: ${findErr.message}`);
        continue;
      }

      if (existing) {
        const { error: updErr } = await supabase
          .from('demo_fx_candles')
          .update({
            high: Math.max(Number(existing.high), mid),
            low: Math.min(Number(existing.low), mid),
            close: mid,
            tick_count: (Number(existing.tick_count) || 0) + 1,
          })
          .eq('id', existing.id);

        if (updErr) errors.push(`update candle ${cr.timeframe}: ${updErr.message}`);
      } else {
        const { error: insErr } = await supabase
          .from('demo_fx_candles')
          .insert(cr);

        if (insErr) errors.push(`insert candle ${cr.timeframe}: ${insErr.message}`);
      }
    } catch (e: any) {
      errors.push(`candle ${cr.timeframe}: ${e?.message || 'unknown'}`);
    }
  }

  return { tickOk: true, candleErrors: errors };
}

// ─── REPRICE OPEN TRADES ────────────────────────────────────────────────────

/**
 * Fetch all open trades on a pair, reprice them with the new bid/ask,
 * auto-close trades that hit SL/TP/liquidation, and return balance to users.
 * Returns a summary of what happened.
 */
export async function repriceOpenDemoTradesForPair(
  supabase: any,
  pairId: string,
  currentBid: number,
  currentAsk: number
): Promise<RepriceResult[]> {
  const now = new Date().toISOString();
  const results: RepriceResult[] = [];

  // Fetch all open trades for this pair
  const { data: openTrades, error: fetchErr } = await supabase
    .from('demo_fx_trades')
    .select('id, user_id, direction, investment, multiplier, entry_price, stop_loss, take_profit, liquidation_price')
    .eq('pair_id', pairId)
    .eq('status', 'open');

  if (fetchErr) {
    console.error('[reprice-helpers] fetch open trades failed:', fetchErr.message);
    return results;
  }

  if (!openTrades || openTrades.length === 0) return results;

  for (const trade of openTrades) {
    const { pnl, markPrice } = calculateFloatingPnL(
      trade.direction,
      Number(trade.investment),
      Number(trade.multiplier),
      Number(trade.entry_price),
      currentBid,
      currentAsk
    );

    const sltpResult = checkSLTP(trade, currentBid, currentAsk);

    if (sltpResult.triggered && sltpResult.exitPrice != null && sltpResult.reason) {
      // Trade needs to close
      const fp = calculateFinalPnL(
        trade.direction,
        Number(trade.investment),
        Number(trade.multiplier),
        Number(trade.entry_price),
        sltpResult.exitPrice
      );

      const returnAmount = Math.max(0, Number(trade.investment) + fp);

      const statusMap: Record<string, string> = {
        liquidation: 'liquidated',
        stop_loss: 'stopped_out',
        take_profit: 'take_profit',
      };

      // Close the trade
      const { error: closeErr } = await supabase
        .from('demo_fx_trades')
        .update({
          status: statusMap[sltpResult.reason] || 'closed',
          close_reason: sltpResult.reason,
          exit_price: sltpResult.exitPrice,
          final_pnl: fp,
          current_price: markPrice,
          floating_pnl: fp,
          closed_at: now,
        })
        .eq('id', trade.id);

      if (closeErr) {
        console.error(`[reprice-helpers] close trade ${trade.id} failed:`, closeErr.message);
      }

      // Return balance to user
      if (returnAmount > 0) {
        const { data: user, error: userErr } = await supabase
          .from('users')
          .select('balance_available')
          .eq('id', trade.user_id)
          .maybeSingle();

        if (!userErr && user) {
          const { error: balErr } = await supabase
            .from('users')
            .update({
              balance_available: Number(user.balance_available || 0) + returnAmount,
            })
            .eq('id', trade.user_id);

          if (balErr) {
            console.error(`[reprice-helpers] balance return for user ${trade.user_id} failed:`, balErr.message);
          }
        }
      }

      results.push({
        trade_id: trade.id,
        user_id: trade.user_id,
        floating_pnl: pnl,
        current_price: markPrice,
        closed: true,
        close_reason: sltpResult.reason,
        exit_price: sltpResult.exitPrice,
        final_pnl: fp,
        return_amount: returnAmount,
      });
    } else {
      // Just update floating PnL
      const { error: markErr } = await supabase
        .from('demo_fx_trades')
        .update({
          current_price: markPrice,
          floating_pnl: pnl,
        })
        .eq('id', trade.id);

      if (markErr) {
        console.error(`[reprice-helpers] mark trade ${trade.id} failed:`, markErr.message);
      }

      results.push({
        trade_id: trade.id,
        user_id: trade.user_id,
        floating_pnl: pnl,
        current_price: markPrice,
        closed: false,
      });
    }
  }

  return results;
}

// ─── SEED HISTORICAL CANDLES ────────────────────────────────────────────────

/**
 * Create ~30 minutes of realistic candle history before the current time.
 * Charts are never blank. Candles show a gentle trend approaching the current price
 * so new session/manual candles continue smoothly.
 */
export async function seedHistoricalCandles(
  supabase: any,
  pairId: string,
  sessionId: string | null,
  bid: number,
  ask: number
): Promise<void> {
  const mid = (bid + ask) / 2;
  if (mid <= 0) return;

  let checkQ = supabase.from('demo_fx_candles').select('id').eq('pair_id', pairId).eq('timeframe', '1m').limit(1);
  if (sessionId) checkQ = checkQ.eq('session_id', sessionId);
  else checkQ = checkQ.is('session_id', null);
  const { data: existing } = await checkQ;

  // If candles already exist for this EXACT session, skip (session already seeded)
  // But if it's a new session_id, they won't exist, so we always seed new sessions
  if (existing && existing.length > 0) return;

  // Candle size proportional to price — ~0.12% body, ~0.08% wick
  const bodyRange = mid * 0.0012;
  const wickRange = mid * 0.0008;
  const now = Date.now();
  const rows: any[] = [];

  // Build 30 x 1m candles with RANDOM directions (not all green)
  let price = mid - bodyRange * 4; // start slightly below

  for (let i = 30; i >= 1; i--) {
    const bucketMs = Math.floor((now - i * 60000) / 60000) * 60000;
    const bucketIso = new Date(bucketMs).toISOString();

    // Random direction: ~55% green (trending toward mid), 45% red
    const bullish = Math.random() < 0.55;
    const body = bodyRange * (0.2 + Math.random() * 0.8); // varied body size
    const upperWick = wickRange * Math.random() * 0.8;
    const lowerWick = wickRange * Math.random() * 0.8;

    // Gentle drift toward mid over time
    const drift = (mid - price) * 0.05;
    price += drift;

    const open = Number(price.toFixed(4));
    const close = Number((price + (bullish ? body : -body)).toFixed(4));
    const high = Number((Math.max(open, close) + upperWick).toFixed(4));
    const low = Number((Math.min(open, close) - lowerWick).toFixed(4));

    price = close; // next candle opens near this close

    rows.push({
      pair_id: pairId, session_id: sessionId || null, timeframe: '1m',
      bucket_start: bucketIso, open, high, low, close, tick_count: 5,
    });
  }

  // 6 x 5m candles
  price = mid - bodyRange * 6;
  for (let i = 6; i >= 1; i--) {
    const bucketMs = Math.floor((now - i * 300000) / 300000) * 300000;
    const bucketIso = new Date(bucketMs).toISOString();

    const bullish = Math.random() < 0.55;
    const body = bodyRange * (0.5 + Math.random() * 1.5);
    const upperWick = wickRange * (0.3 + Math.random());
    const lowerWick = wickRange * (0.3 + Math.random());

    price += (mid - price) * 0.15;

    const open = Number(price.toFixed(4));
    const close = Number((price + (bullish ? body : -body)).toFixed(4));
    const high = Number((Math.max(open, close) + upperWick).toFixed(4));
    const low = Number((Math.min(open, close) - lowerWick).toFixed(4));
    price = close;

    rows.push({
      pair_id: pairId, session_id: sessionId || null, timeframe: '5m',
      bucket_start: bucketIso, open, high, low, close, tick_count: 20,
    });
  }

  for (const row of rows) {
    try { await supabase.from('demo_fx_candles').insert(row); } catch {}
  }
}
