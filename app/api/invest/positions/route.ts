import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEtf } from '@/lib/etf-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * GET /api/invest/positions?userId=...
 *
 * Returns the user's stock/ETF holdings (from the `positions` table that
 * the invest buy flow writes to) enriched with current price + value, so
 * the portfolio and dashboard can fold them into total equity. This is
 * what makes "stocks count as portfolio everywhere" true.
 */
export async function GET(req: NextRequest) {
  try {
    const sb = admin();
    if (!sb) {
      return NextResponse.json({ ok: true, positions: [], totalValue: 0 });
    }

    const userId = new URL(req.url).searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('positions')
      .select('id, symbol, asset_type, quantity, avg_entry_price, market_value')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    let totalValue = 0;
    let totalCost = 0;

    const positions = (data || []).map(p => {
      const qty = Number(p.quantity) || 0;
      const avg = Number(p.avg_entry_price) || 0;
      // Current price: use seed price from the ETF catalog if available,
      // else fall back to avg entry. (Phase-2: live quote feed.)
      const etf = getEtf(p.symbol);
      const price = etf?.seedPrice ?? avg;
      const value = qty * price;
      const cost = qty * avg;
      const pnl = value - cost;
      totalValue += value;
      totalCost += cost;
      return {
        id: p.id,
        symbol: p.symbol,
        assetType: p.asset_type,
        name: etf?.name || p.symbol,
        quantity: qty,
        avgPrice: avg,
        price,
        value,
        pnl,
        pnlPct: cost > 0 ? (pnl / cost) * 100 : 0,
      };
    });

    return NextResponse.json({
      ok: true,
      positions,
      totalValue,
      totalCost,
      totalPnl: totalValue - totalCost,
      count: positions.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
