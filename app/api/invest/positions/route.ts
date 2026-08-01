import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAsset } from '@/lib/asset-catalog';
import { positionMath, todaysGainForPosition, n } from '@/lib/calc';

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
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    let totalValue = 0;
    let totalCost = 0;
    let totalDayGain = 0;

    const positions = (data || []).map(p => {
      const qty = n(p.quantity);
      const avg = n(p.avg_entry_price);
      const asset = getAsset(p.symbol);
      const price = asset?.seedPrice ?? avg;
      const dayPct = asset?.seedChangePct ?? 0;

      const m = positionMath({ quantity: qty, avgPrice: avg, currentPrice: price });
      const dg = todaysGainForPosition(qty, price, dayPct);

      totalValue += m.marketValue;
      totalCost  += m.costBasis;
      totalDayGain += dg.gain;

      return {
        id: p.id,
        symbol: p.symbol,
        shieldEnabled: !!p.shield_enabled,
        assetType: p.asset_type,
        name: asset?.name || p.symbol,
        quantity: qty,
        avgPrice: avg,
        price,
        value: m.marketValue,
        costBasis: m.costBasis,
        pnl: m.pnl,
        pnlPct: m.pnlPct,
        dayGain: dg.gain,
        dayGainPct: dg.gainPct,
      };
    });

    return NextResponse.json({
      ok: true,
      positions,
      totalValue,
      totalCost,
      totalPnl: totalValue - totalCost,
      totalPnlPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
      totalDayGain,
      totalDayGainPct: totalValue > 0 ? (totalDayGain / totalValue) * 100 : 0,
      count: positions.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
