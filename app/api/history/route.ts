/**
 * GET /api/history?userId=...
 * Full transaction history, server-side (service role). Client-side reads are
 * blocked by RLS because the app uses custom auth (auth.uid() is null).
 * Returns a single normalized, date-sorted list.
 */
import { NextRequest, NextResponse } from 'next/server';
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
const safe = async (p: any) => { try { const r = await p; return r?.data || []; } catch { return []; } };

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ ok: false, items: [] }, { status: 503 });
  const userId = new URL(req.url).searchParams.get('userId') || '';
  if (!userId) return NextResponse.json({ ok: true, items: [] });

  const [trades, deposits, withdrawals, tiers, txs, referrals, bridges] = await Promise.all([
    safe(sb.from('trades').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)),
    safe(sb.from('deposits').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)),
    safe(sb.from('withdrawals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)),
    safe(sb.from('tier_purchases').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)),
    safe(sb.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)),
    safe(sb.from('referrals').select('*').eq('referrer_id', userId).order('created_at', { ascending: false }).limit(20)),
    safe(sb.from('bridge_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)),
  ]);

  const items: any[] = [];

  for (const t of txs as any[]) {
    const type = String(t.type || '');
    const isBuy = type === 'buy' || type === 'invest_buy';
    const isSell = type === 'sell' || type === 'invest_sell';
    items.push({
      id: `tx-${t.id}`,
      category: isBuy || isSell ? 'trade' : type === 'fee' ? 'fee' : type,
      title: isBuy || isSell ? `${isBuy ? 'Bought' : 'Sold'} ${t.symbol || ''}`.trim()
        : type === 'fee' ? (t.description || 'Fee')
        : type === 'deposit' ? 'Deposit' : type === 'tier_bonus' ? 'Bonus credit'
        : (t.description || type),
      subtitle: t.description || '',
      amount: Math.abs(num(t.amount)),
      direction: isBuy || type === 'fee' ? 'out' : 'in',
      status: t.status || 'completed',
      symbol: t.symbol || null,
      quantity: t.quantity != null ? num(t.quantity) : null,
      price: t.price != null ? num(t.price) : null,
      created_at: t.created_at,
    });
  }

  for (const t of trades as any[]) {
    const sell = String(t.side || '').toLowerCase() === 'sell';
    items.push({
      id: `trade-${t.id}`, category: 'trade',
      title: `${sell ? 'Sold' : 'Bought'} ${t.symbol || ''}`.trim(),
      subtitle: t.market_type || t.asset_type || '',
      amount: Math.abs(num(t.total_value ?? t.amount)),
      direction: sell ? 'in' : 'out',
      status: t.status || 'filled', symbol: t.symbol || null,
      quantity: num(t.quantity) || null, price: num(t.price) || null,
      created_at: t.created_at || t.opened_at,
    });
  }

  for (const d of deposits as any[]) {
    items.push({ id: `dep-${d.id}`, category: 'deposit', title: 'Deposit',
      subtitle: d.method || d.currency || '', amount: Math.abs(num(d.amount)),
      direction: 'in', status: d.status || 'pending', created_at: d.created_at });
  }
  for (const w of withdrawals as any[]) {
    items.push({ id: `wd-${w.id}`, category: 'withdrawal', title: 'Withdrawal',
      subtitle: w.method || w.currency || '', amount: Math.abs(num(w.amount)),
      direction: 'out', status: w.status || 'pending', created_at: w.created_at });
  }
  for (const b of bridges as any[]) {
    items.push({ id: `br-${b.id}`, category: 'bridge', title: 'SwiftBridge',
      subtitle: `${b.local_amount || ''} ${b.local_currency || ''} to ${b.target_asset || ''}`.trim(),
      amount: Math.abs(num(b.estimated_credit_usd)), direction: 'in',
      status: b.status, created_at: b.created_at });
  }
  for (const p of tiers as any[]) {
    items.push({ id: `tier-${p.id}`, category: 'membership', title: 'Membership',
      subtitle: p.tier_code || '', amount: Math.abs(num(p.amount_paid ?? p.amount)),
      direction: 'out', status: p.status, created_at: p.created_at });
  }
  for (const r of referrals as any[]) {
    items.push({ id: `ref-${r.id}`, category: 'referral', title: 'Referral',
      subtitle: r.reward_paid ? 'Reward paid' : 'Signup',
      amount: Math.abs(num(r.reward_amount)), direction: 'in',
      status: r.reward_paid ? 'completed' : 'pending', created_at: r.created_at });
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return NextResponse.json({ ok: true, items });
}
