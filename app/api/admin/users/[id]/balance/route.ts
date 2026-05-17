/**
 * ADMIN USER BALANCE API
 * POST /api/admin/users/[id]/balance
 *
 * body: { type: 'spot'|'bonus', action: 'add'|'subtract'|'set', amount, note }
 *
 * FIX: Always re-read current balance right before writing to avoid stale-data issues.
 *      Returns the updated user row so frontend can refresh immediately.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: userId } = await ctx.params;

  let body: any = {};
  try { body = await req.json(); } catch {}

  const type = String(body?.type || 'spot');
  const action = String(body?.action || 'add');
  const note = String(body?.note || '').trim();
  const amount = Number(body?.amount);

  if (!userId) return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  if (!note) return NextResponse.json({ error: 'Missing note' }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  if (!['spot', 'bonus'].includes(type)) return NextResponse.json({ error: 'type must be spot or bonus' }, { status: 400 });
  if (!['add', 'subtract', 'set'].includes(action)) return NextResponse.json({ error: 'action must be add, subtract, or set' }, { status: 400 });

  const field = type === 'bonus' ? 'balance_bonus' : 'balance_available';

  // Fresh read right before write (prevents stale data from cached admin page)
  const { data: user, error: uErr } = await auth.supabaseAdmin
    .from('users')
    .select(`id, email, first_name, last_name, balance_available, balance_bonus`)
    .eq('id', userId)
    .maybeSingle();

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const current = Number((user as any)[field] ?? 0);
  let next: number;

  if (action === 'add') next = current + amount;
  else if (action === 'subtract') next = Math.max(0, current - amount);
  else next = amount; // 'set'

  // Round to 2dp to avoid floating point drift
  next = Math.round(next * 100) / 100;

  const { data: updated, error: upErr } = await auth.supabaseAdmin
    .from('users')
    .update({ [field]: next })
    .eq('id', userId)
    .select('*')
    .maybeSingle();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

  // Audit
  try {
    await auth.supabaseAdmin.from('admin_audit_log').insert({
      admin_id: auth.adminId,
      target_user_id: userId,
      action: 'balance_adjustment',
      meta: { type, action, amount, field, from: current, to: next, note },
      created_at: new Date().toISOString(),
    });
  } catch {}

  return NextResponse.json({
    ok: true,
    user: updated,
    adjustment: { type, action, amount, field, from: current, to: next, note },
  });
}
