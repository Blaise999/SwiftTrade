/**
 * USER DEMO FX LIVE PRICES
 * GET - Get current prices for all active demo FX pairs (lightweight polling endpoint)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: pairs, error } = await supabase
    .from('demo_fx_pairs')
    .select('id, symbol, current_bid, current_ask, mode, price_updated_at')
    .eq('is_active', true)
    .order('display_order');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Build lightweight price map
  const prices: Record<string, { bid: number; ask: number; mid: number; updated: string }> = {};
  for (const p of (pairs || [])) {
    const bid = Number(p.current_bid);
    const ask = Number(p.current_ask);
    prices[p.id] = {
      bid,
      ask,
      mid: (bid + ask) / 2,
      updated: p.price_updated_at,
    };
  }

  return NextResponse.json({ prices, timestamp: Date.now() });
}
