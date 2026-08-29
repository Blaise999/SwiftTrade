import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { emailUser } from '@/lib/email/events';
import { createClient } from '@supabase/supabase-js';
import { avgCostAfterBuy, estimatedShares, estimatedCost, n } from '@/lib/calc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  return supabaseAdmin();
}

/**
 * POST /api/invest/order
 * Body: { userId, symbol, assetType, side, amountType, amount, price }
 *
 * Persists an ETF/stock order and updates the user's position so it
 * shows up in the portfolio everywhere. Money-safe: it validates the
 * user's available balance before a buy and deducts it atomically-ish
 * (read-modify-write; fine for this app's volume).
 *
 * NOTE: this records the holding in our DB. Live broker (Alpaca) order
 * routing is the Phase-2 hook — clearly isolated below.
 */
export async function POST(req: NextRequest) {
  try {
    const sb = admin();
    if (!sb) {
      return NextResponse.json(
        { ok: false, error: 'service role not configured' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const userId = String(body?.userId || '');
    const symbol = String(body?.symbol || '').toUpperCase();
    const assetType = body?.assetType === 'stock' ? 'stock' : 'etf';
    const side = body?.side === 'sell' ? 'sell' : 'buy';
    const amountType = body?.amountType === 'qty' ? 'qty' : 'notional';
    const amount = Number(body?.amount) || 0;
    const price = Number(body?.price) || 0;

    if (!userId || !symbol || amount <= 0 || price <= 0) {
      return NextResponse.json(
        { ok: false, error: 'userId, symbol, amount, price required' },
        { status: 400 }
      );
    }

    const qty = amountType === 'notional' ? estimatedShares(amount, price) : amount;
    const cost = amountType === 'notional' ? amount : estimatedCost(amount, price);

    // ── Load user balance ──
    const { data: u, error: uErr } = await sb
      .from('users')
      .select('id, balance_available')
      .eq('id', userId)
      .single();

    if (uErr || !u) {
      return NextResponse.json({ ok: false, error: 'user not found' }, { status: 404 });
    }

    const bal = Number(u.balance_available) || 0;

    if (side === 'buy' && cost > bal) {
      return NextResponse.json(
        { ok: false, error: 'insufficient_balance', need: cost, have: bal },
        { status: 400 }
      );
    }

    // ── Record the order ──
    const { data: order, error: oErr } = await sb
      .from('orders')
      .insert({
        user_id: userId,
        symbol,
        asset_type: assetType,
        side,
        order_type: 'market',
        time_in_force: 'day',
        amount_type: amountType,
        notional_amount: amountType === 'notional' ? amount : null,
        quantity: qty,
        estimated_price: price,
        status: 'filled', // simulated fill; Phase-2: set from broker response
      })
      .select('id')
      .single();

    if (oErr) {
      return NextResponse.json({ ok: false, error: oErr.message }, { status: 500 });
    }

    // ── Upsert the position ──
    const { data: existing } = await sb
      .from('positions')
      .select('id, quantity, avg_entry_price')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .maybeSingle();

    if (side === 'buy') {
      let posErr: any = null;
      if (existing) {
        const { qty: newQty, avg: newAvg } = avgCostAfterBuy(
          n(existing.quantity), n(existing.avg_entry_price), qty, price
        );
        const { error } = await sb
          .from('positions')
          .update({
            quantity: newQty,
            avg_entry_price: newAvg,
            market_value: newQty * price,
          })
          .eq('id', existing.id);
        posErr = error;
      } else {
        const { error } = await sb.from('positions').insert({
          user_id: userId,
          symbol,
          asset_type: assetType,
          quantity: qty,
          avg_entry_price: price,
          market_value: qty * price,
        });
        posErr = error;
      }

      // CRITICAL: if the position didn't save, do NOT take the money.
      if (posErr) {
        return NextResponse.json({
          ok: false,
          error: `Position could not be saved: ${posErr.message}. Balance was not charged. (Run sql/FIX_TRADING_PERSISTENCE.sql if the positions table is missing.)`,
          code: 'POSITION_WRITE_FAILED',
        }, { status: 500 });
      }

      // Deduct balance only after the position is safely stored
      await sb
        .from('users')
        .update({ balance_available: bal - cost })
        .eq('id', userId);
    } else {
      // sell
      if (existing) {
        const prevQty = Number(existing.quantity) || 0;
        const sellQty = Math.min(qty, prevQty);
        const remaining = prevQty - sellQty;
        if (remaining <= 0.0000001) {
          await sb.from('positions').delete().eq('id', existing.id);
        } else {
          await sb
            .from('positions')
            .update({
              quantity: remaining,
              market_value: remaining * price,
            })
            .eq('id', existing.id);
        }
        await sb
          .from('users')
          .update({ balance_available: bal + sellQty * price })
          .eq('id', userId);
      }
    }

    // ── Audit trail ──
    try {
      await sb.from('transactions').insert({
        user_id: userId,
        type: side === 'buy' ? 'invest_buy' : 'invest_sell', symbol,
        amount: cost,
        description: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty.toFixed(4)} ${symbol}`,
        reference_type: 'order',
        status: 'completed',
      });
    } catch {/* non-fatal */}

    // in-app notification + email
    const { error: notifErr } = await sb.from('notifications').insert({
      user_id: userId, type: side === 'buy' ? 'buy' : 'sell',
      title: `${side === 'buy' ? 'Bought' : 'Sold'} ${symbol}`,
      message: `${side === 'buy' ? 'Bought' : 'Sold'} ${qty.toFixed(4)} ${symbol} for $${cost.toFixed(2)} at $${price.toLocaleString()}.`,
      metadata: { market: 'stock', symbol, side, cost, price },
    });
    if (notifErr) console.error('[invest/order] notification FAILED:', notifErr.message);
    emailUser(userId, {
      title: `${side === 'buy' ? 'Bought' : 'Sold'} ${symbol}`,
      tone: side === 'buy' ? 'success' : 'default',
      message: `You ${side === 'buy' ? 'bought' : 'sold'} ${qty.toFixed(4)} ${symbol} for $${cost.toFixed(2)}.`,
      rows: [
        { label: 'Amount', value: `$${cost.toFixed(2)}` },
        { label: 'Price', value: `$${price.toLocaleString()}` },
        { label: 'Shares', value: `${qty.toFixed(4)}` },
      ],
      ctaText: 'View portfolio', ctaUrl: (process.env.NEXT_PUBLIC_APP_URL || '') + '/dashboard/portfolio',
    });

    /* ─────────────────────────────────────────────────────────────
       PHASE-2 HOOK — live broker routing
       Once Alpaca keys are configured, place the real order here and
       reconcile order.status / position.quantity from the broker fill.
       Left intentionally unimplemented so this endpoint never moves
       real brokerage money in its current state.
       ───────────────────────────────────────────────────────────── */

    return NextResponse.json({
      ok: true,
      orderId: order?.id,
      symbol,
      side,
      quantity: qty,
      price,
      cost,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
