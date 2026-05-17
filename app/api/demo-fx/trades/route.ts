/**
 * USER DEMO FX TRADES API
 * GET  - List user's demo trades
 * POST - Open a new demo trade
 * PUT  - Close a demo trade
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  calculateLiquidationPrice,
  calculateFinalPnL,
} from '@/lib/demo-fx/pnl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getUserId(request: NextRequest): Promise<string | null> {
  const userId = request.headers.get('x-user-id');
  if (userId) return userId;

  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  try {
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase();
    const { data } = await supabase.auth.getUser(token);
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Single source of truth for demo FX pricing:
 * always prefer ASK, fallback to BID.
 */
function getUnifiedPrice(bid: number, ask: number) {
  if (Number.isFinite(ask) && ask > 0) return ask;
  if (Number.isFinite(bid) && bid > 0) return bid;
  return 0;
}

// ─── GET: LIST TRADES ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status'); // 'open' or 'all'

  let query = supabase
    .from('demo_fx_trades')
    .select('*')
    .eq('user_id', userId)
    .order('opened_at', { ascending: false });

  if (status === 'open') {
    query = query.eq('status', 'open');
  }

  const { data: trades, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ trades });
}

// ─── POST: OPEN TRADE ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const {
    pair_id,
    direction,
    investment,
    multiplier = 1,
    stop_loss,
    take_profit,
  } = body;

  if (!pair_id) {
    return NextResponse.json({ error: 'Missing pair_id' }, { status: 400 });
  }

  if (!direction || !['buy', 'sell'].includes(direction)) {
    return NextResponse.json({ error: 'direction must be buy or sell' }, { status: 400 });
  }

  const investmentNum = Number(investment);
  const multiplierNum = Number(multiplier);

  if (!Number.isFinite(investmentNum) || investmentNum <= 0) {
    return NextResponse.json({ error: 'investment must be > 0' }, { status: 400 });
  }

  if (!Number.isFinite(multiplierNum) || multiplierNum < 1) {
    return NextResponse.json({ error: 'multiplier must be >= 1' }, { status: 400 });
  }

  // Fetch pair current prices
  const { data: pair, error: pairErr } = await supabase
    .from('demo_fx_pairs')
    .select('*')
    .eq('id', pair_id)
    .eq('is_active', true)
    .maybeSingle();

  if (pairErr) return NextResponse.json({ error: pairErr.message }, { status: 400 });
  if (!pair) return NextResponse.json({ error: 'Pair not found or inactive' }, { status: 404 });

  const bid = Number(pair.current_bid);
  const ask = Number(pair.current_ask);
  const unifiedPrice = getUnifiedPrice(bid, ask);

  if (!(unifiedPrice > 0)) {
    return NextResponse.json({ error: 'Invalid live pair price' }, { status: 400 });
  }

  const directionInt = direction === 'buy' ? 1 : -1;
  const entryPrice = unifiedPrice;
  const liquidationPrice = calculateLiquidationPrice(
    directionInt as 1 | -1,
    entryPrice,
    multiplierNum
  );
  const spreadCost = 0;
  const volume = investmentNum * multiplierNum;

  const stopLossNum =
    stop_loss != null && stop_loss !== '' ? Number(stop_loss) : null;
  const takeProfitNum =
    take_profit != null && take_profit !== '' ? Number(take_profit) : null;

  // Validate SL/TP
  if (stopLossNum != null) {
    if (!Number.isFinite(stopLossNum) || stopLossNum <= 0) {
      return NextResponse.json({ error: 'Invalid stop_loss' }, { status: 400 });
    }

    if (direction === 'buy' && stopLossNum >= entryPrice) {
      return NextResponse.json(
        { error: 'Buy stop_loss must be below entry price' },
        { status: 400 }
      );
    }

    if (direction === 'sell' && stopLossNum <= entryPrice) {
      return NextResponse.json(
        { error: 'Sell stop_loss must be above entry price' },
        { status: 400 }
      );
    }
  }

  if (takeProfitNum != null) {
    if (!Number.isFinite(takeProfitNum) || takeProfitNum <= 0) {
      return NextResponse.json({ error: 'Invalid take_profit' }, { status: 400 });
    }

    if (direction === 'buy' && takeProfitNum <= entryPrice) {
      return NextResponse.json(
        { error: 'Buy take_profit must be above entry price' },
        { status: 400 }
      );
    }

    if (direction === 'sell' && takeProfitNum >= entryPrice) {
      return NextResponse.json(
        { error: 'Sell take_profit must be below entry price' },
        { status: 400 }
      );
    }
  }

  // Check user balance (demo balance)
  const { data: user } = await supabase
    .from('users')
    .select('balance_available')
    .eq('id', userId)
    .maybeSingle();

  const balance = Number(user?.balance_available || 0);
  if (balance < investmentNum) {
    return NextResponse.json(
      { error: `Insufficient demo balance. Available: $${balance.toFixed(2)}` },
      { status: 400 }
    );
  }

  // Deduct investment from balance
  const { error: balErr } = await supabase
    .from('users')
    .update({ balance_available: balance - investmentNum })
    .eq('id', userId);

  if (balErr) return NextResponse.json({ error: balErr.message }, { status: 400 });

  // Create trade
  const now = new Date().toISOString();
  const { data: trade, error: tradeErr } = await supabase
    .from('demo_fx_trades')
    .insert({
      user_id: userId,
      pair_id,
      session_id: pair.active_session_id || null,
      symbol: pair.symbol,
      direction: directionInt,
      direction_label: direction,
      investment: investmentNum,
      multiplier: multiplierNum,
      volume,
      entry_bid: bid,
      entry_ask: ask,
      entry_price: entryPrice,
      stop_loss: stopLossNum,
      take_profit: takeProfitNum,
      liquidation_price: liquidationPrice,
      current_price: unifiedPrice,
      floating_pnl: 0,
      spread_cost: spreadCost,
      status: 'open',
      opened_at: now,
    })
    .select('*')
    .single();

  if (tradeErr) {
    // Rollback balance
    await supabase.from('users').update({ balance_available: balance }).eq('id', userId);
    return NextResponse.json({ error: tradeErr.message }, { status: 400 });
  }

  return NextResponse.json({ trade }, { status: 201 });
}

// ─── PUT: CLOSE TRADE ───────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const { trade_id } = body;
  if (!trade_id) {
    return NextResponse.json({ error: 'Missing trade_id' }, { status: 400 });
  }

  // Fetch trade
  const { data: trade, error: fetchErr } = await supabase
    .from('demo_fx_trades')
    .select('*')
    .eq('id', trade_id)
    .eq('user_id', userId)
    .eq('status', 'open')
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });
  if (!trade) {
    return NextResponse.json({ error: 'Trade not found or already closed' }, { status: 404 });
  }

  // Get current pair price
  const { data: pair } = await supabase
    .from('demo_fx_pairs')
    .select('current_bid, current_ask')
    .eq('id', trade.pair_id)
    .maybeSingle();

  if (!pair) return NextResponse.json({ error: 'Pair not found' }, { status: 404 });

  const bid = Number(pair.current_bid);
  const ask = Number(pair.current_ask);
  const exitPrice = getUnifiedPrice(bid, ask);

  if (!(exitPrice > 0)) {
    return NextResponse.json({ error: 'Invalid exit price' }, { status: 400 });
  }

  const finalPnl = calculateFinalPnL(
    trade.direction as 1 | -1,
    Number(trade.investment),
    Number(trade.multiplier),
    Number(trade.entry_price),
    exitPrice
  );

  const now = new Date().toISOString();

  // Close trade
  const { data: closed, error: closeErr } = await supabase
    .from('demo_fx_trades')
    .update({
      status: 'closed',
      close_reason: 'manual',
      exit_price: exitPrice,
      final_pnl: finalPnl,
      current_price: exitPrice,
      floating_pnl: finalPnl,
      closed_at: now,
    })
    .eq('id', trade_id)
    .select('*')
    .single();

  if (closeErr) return NextResponse.json({ error: closeErr.message }, { status: 400 });

  // Return investment + PnL to balance
  const returnAmount = Number(trade.investment) + finalPnl;
  if (returnAmount > 0) {
    const { data: user } = await supabase
      .from('users')
      .select('balance_available')
      .eq('id', userId)
      .maybeSingle();

    const currentBalance = Number(user?.balance_available || 0);

    await supabase
      .from('users')
      .update({ balance_available: currentBalance + returnAmount })
      .eq('id', userId);
  }

  // Send trade confirmation email (fire-and-forget)
  try {
    const { sendTradeConfirmEmail } = await import('@/lib/email');
    const { data: userProfile } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();
    if (userProfile?.email) {
      const userName = [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || 'Trader';
      const tradeDir = Number(trade.direction) >= 1 ? 'buy' : 'sell';
      void sendTradeConfirmEmail(userProfile.email, {
        name: userName,
        type: tradeDir as 'buy' | 'sell',
        asset: trade.symbol || trade.pair_id || 'FX',
        amount: `$${Number(trade.investment).toFixed(2)}`,
        price: `${Number(trade.entry_price).toFixed(5)} → ${exitPrice.toFixed(5)}`,
        total: `$${returnAmount.toFixed(2)}`,
        result: finalPnl >= 0 ? 'win' : 'loss',
        profit: `$${Math.abs(finalPnl).toFixed(2)}`,
      });
    }
  } catch (emailErr) {
    console.error('[DemoFX Trades] Email send failed:', emailErr);
  }

  return NextResponse.json({ trade: closed });
}