import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const pairId = searchParams.get('pair_id');
  const status = searchParams.get('status');

  let q = auth.supabaseAdmin
    .from('demo_fx_trades')
    .select('*, users(email, first_name, last_name, balance_available)')
    .order('opened_at', { ascending: false })
    .limit(500);

  if (pairId) q = q.eq('pair_id', pairId);
  if (status === 'open') q = q.eq('status', 'open');

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ trades: data || [] });
}
