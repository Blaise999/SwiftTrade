/**
 * GET /api/activity?userId=...
 *
 * Recent activity, server-side. The client CANNOT read these tables directly:
 * RLS is enabled and the app uses custom auth, so auth.uid() is null and every
 * client-side query returns zero rows. This route uses the service-role key.
 */
import { NextRequest, NextResponse } from 'next/server';
import { jsonNoStore } from '@/lib/no-store';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const safe = async (p: any) => { try { return await p; } catch { return { data: [] }; } };

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return jsonNoStore({ ok: false, items: [] }, { status: 503 });
  const userId = new URL(req.url).searchParams.get('userId') || '';
  if (!userId) return jsonNoStore({ ok: true, items: [] });

  const [tx, dep, wd, br, tr] = await Promise.all([
    safe(sb.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(25)),
    safe(sb.from('deposits').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)),
    safe(sb.from('withdrawals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)),
    safe(sb.from('bridge_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)),
    safe(sb.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)),
  ]);

  const items: any[] = [];

  for (const t of ((tx as any).data || [])) {
    const type = String(t.type || '');
    const isBuy = type === 'buy' || type === 'invest_buy';
    const isSell = type === 'sell' || type === 'invest_sell';
    const isFee = type === 'fee';
    items.push({
      id: `tx-${t.id}`,
      kind: isBuy || isSell ? 'trade' : isFee ? 'fee' : type,
      label: isBuy || isSell
        ? `${isBuy ? 'Bought' : 'Sold'} ${t.symbol || ''}`.trim()
        : isFee ? (t.description || 'Fee')
        : type === 'deposit' ? 'Deposit'
        : type === 'tier_bonus' ? 'Bonus credit'
        : (t.description || type),
      sublabel: t.description || '',
      amount: Math.abs(num(t.amount)),
      pnl: isBuy || isFee ? -Math.abs(num(t.amount)) : Math.abs(num(t.amount)),
      status: t.status || 'completed',
      created_at: t.created_at,
    });
  }

  for (const t of ((tr as any).data || [])) {
    items.push({
      id: `tr-${t.id}`, kind: 'trade',
      label: `${String(t.side || '').toLowerCase() === 'sell' ? 'Sold' : 'Bought'} ${t.symbol || ''}`.trim(),
      sublabel: t.market_type || t.asset_type || '',
      amount: Math.abs(num(t.total_value ?? t.amount)),
      pnl: num(t.realized_pnl),
      status: t.status || 'filled',
      created_at: t.created_at || t.opened_at,
    });
  }

  for (const d of ((dep as any).data || [])) {
    items.push({
      id: `dep-${d.id}`, kind: 'deposit', label: 'Deposit',
      sublabel: d.method || d.currency || '', amount: Math.abs(num(d.amount)),
      pnl: Math.abs(num(d.amount)), status: d.status || 'pending', created_at: d.created_at,
    });
  }

  for (const w of ((wd as any).data || [])) {
    items.push({
      id: `wd-${w.id}`, kind: 'withdrawal', label: 'Withdrawal',
      sublabel: w.method || w.currency || '', amount: Math.abs(num(w.amount)),
      pnl: -Math.abs(num(w.amount)), status: w.status || 'pending', created_at: w.created_at,
    });
  }

  for (const b of ((br as any).data || [])) {
    items.push({
      id: `br-${b.id}`, kind: 'bridge', label: 'SwiftBridge',
      sublabel: `${b.local_amount || ''} ${b.local_currency || ''} to ${b.target_asset || ''}`.trim(),
      amount: Math.abs(num(b.estimated_credit_usd)),
      pnl: Math.abs(num(b.estimated_credit_usd)), status: b.status, created_at: b.created_at,
    });
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return jsonNoStore({ ok: true, items: items.slice(0, 12) });
}
