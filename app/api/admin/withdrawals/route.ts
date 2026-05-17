import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function getAdminToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function isAdminAuthorized(request: NextRequest) {
  const token = getAdminToken(request);
  const expected = process.env.ADMIN_SESSION_TOKEN || process.env.NEXT_PUBLIC_ADMIN_TOKEN || '';
  if (!expected) return true;
  return token === expected;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();

    let query = supabase
      .from('withdrawals')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: withdrawals, error } = await query;
    if (error) throw error;

    const userIds = Array.from(new Set((withdrawals || []).map((w: any) => w.user_id).filter(Boolean)));

    let usersMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, balance_available')
        .in('id', userIds);

      usersMap = Object.fromEntries((users || []).map((u: any) => [u.id, u]));
    }

    let merged = (withdrawals || []).map((w: any) => ({
      ...w,
      user: usersMap[w.user_id] || null,
    }));

    if (q) {
      merged = merged.filter((w: any) => {
        const email = String(w.user?.email || '').toLowerCase();
        const first = String(w.user?.first_name || '').toLowerCase();
        const last = String(w.user?.last_name || '').toLowerCase();
        const asset = String(w.asset || '').toLowerCase();
        const network = String(w.network || '').toLowerCase();
        const address = String(w.destination_address || '').toLowerCase();
        return (
          email.includes(q) ||
          first.includes(q) ||
          last.includes(q) ||
          asset.includes(q) ||
          network.includes(q) ||
          address.includes(q)
        );
      });
    }

    return NextResponse.json({ success: true, withdrawals: merged });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load withdrawals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const body = await request.json();

    const withdrawalId = String(body.id || '').trim();
    const action = String(body.action || '').trim();
    const adminNote = body.admin_note ? String(body.admin_note).trim() : null;
    const rejectionReason = body.rejection_reason ? String(body.rejection_reason).trim() : null;
    const txHash = body.tx_hash ? String(body.tx_hash).trim() : null;

    if (!withdrawalId || !action) {
      return NextResponse.json({ success: false, error: 'id and action are required' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return NextResponse.json({ success: false, error: 'Withdrawal not found' }, { status: 404 });

    const now = new Date().toISOString();
    const userId = String(existing.user_id || '');
    const amount = Number(existing.amount || 0);

    if (!userId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid withdrawal data' }, { status: 400 });
    }

    const updates: Record<string, any> = { updated_at: now };

    // ==================== APPROVE (deducts from the exact balance the Wallet page reads) ====================
    if (action === 'approve') {
      if (existing.status !== 'pending') {
        return NextResponse.json({ success: false, error: 'Only pending withdrawals can be approved' }, { status: 400 });
      }

      // Fetch the same field the frontend uses
      const { data: userRow, error: userErr } = await supabase
        .from('users')
        .select('balance_available')
        .eq('id', userId)
        .maybeSingle();

      if (userErr || !userRow) throw userErr || new Error('User not found');

      const currentBalance = Number(userRow.balance_available ?? 0);

      if (amount > currentBalance) {
        return NextResponse.json({ success: false, error: 'User balance is now too low for approval' }, { status: 400 });
      }

      const newBalance = currentBalance - amount;

      // Guarded update
      const { data: upd, error: updErr } = await supabase
        .from('withdrawals')
        .update({ status: 'approved', admin_note: adminNote, updated_at: now })
        .eq('id', withdrawalId)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();

      if (updErr) throw updErr;
      if (!upd?.id) {
        return NextResponse.json({ success: false, error: 'Withdrawal already processed' }, { status: 400 });
      }

      // Deduct from the exact field the Wallet page reads
      const { error: balErr } = await supabase
        .from('users')
        .update({ balance_available: newBalance })
        .eq('id', userId);

      if (balErr) throw balErr;

      // Log transaction
      void supabase.from('transactions').insert({
        user_id: userId,
        type: 'withdrawal',
        amount,
        currency: existing.asset || 'USD',
        balance_before: currentBalance,
        balance_after: newBalance,
        status: 'completed',
        reference_type: 'withdrawal_approval',
        description: `Withdrawal approved: $${amount.toFixed(2)} ${existing.asset || ''}`,
        metadata: { withdrawal_id: withdrawalId },
      });

      // Notification
      void supabase.from('notifications').insert({
        user_id: userId,
        type: 'withdrawal',
        title: 'Withdrawal Approved',
        message: `Your $${amount.toFixed(2)} ${existing.asset} withdrawal has been approved.`,
        data: { withdrawal_id: withdrawalId },
      });

    // ==================== REJECT ====================
    } else if (action === 'reject') {
      if (existing.status !== 'pending') {
        return NextResponse.json({ success: false, error: 'Only pending withdrawals can be rejected' }, { status: 400 });
      }

      if (!rejectionReason || rejectionReason.length < 3) {
        return NextResponse.json({ success: false, error: 'A detailed rejection reason is required' }, { status: 400 });
      }

      updates.status = 'rejected';
      updates.rejection_reason = rejectionReason;
      updates.admin_note = adminNote;

      const { error: updErr } = await supabase
        .from('withdrawals')
        .update(updates)
        .eq('id', withdrawalId)
        .eq('status', 'pending');

      if (updErr) throw updErr;

    // ==================== MARK PAID ====================
    } else if (action === 'paid') {
      if (existing.status !== 'approved') {
        return NextResponse.json({ success: false, error: 'Only approved withdrawals can be marked paid' }, { status: 400 });
      }

      updates.status = 'paid';
      updates.tx_hash = txHash || existing.tx_hash || null;
      updates.admin_note = adminNote;

      const { error: updErr } = await supabase
        .from('withdrawals')
        .update(updates)
        .eq('id', withdrawalId)
        .eq('status', 'approved');

      if (updErr) throw updErr;
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    // Email notifications (unchanged — already working)
    try {
      const { data: userProfile } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .maybeSingle();

      if (userProfile?.email) {
        const userName = [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || 'Trader';
        const amt = `$${amount.toFixed(2)}`;
        const asset = existing.asset || 'USD';
        const dest = existing.destination_address || 'N/A';
        const reqId = withdrawalId;

        if (action === 'reject') {
          const { sendWithdrawalRejectedEmail } = await import('@/lib/email');
          void sendWithdrawalRejectedEmail(userProfile.email, {
            name: userName,
            amount: amt,
            currency: asset,
            method: 'Crypto',
            destination: dest,
            requestId: reqId,
            rejectionReason: rejectionReason || 'No reason provided',
          });
        } else if (action === 'approve') {
          const { sendWithdrawalApprovedEmail } = await import('@/lib/email');
          void sendWithdrawalApprovedEmail(userProfile.email, {
            name: userName,
            amount: amt,
            currency: asset,
            method: 'Crypto',
            destination: dest,
            requestId: reqId,
          });
        }
      }
    } catch (emailErr) {
      console.error('[Admin Withdrawals] Email send failed:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message:
        action === 'approve'
          ? `Withdrawal approved — $${amount.toFixed(2)} deducted from balance_available`
          : action === 'reject'
            ? 'Withdrawal rejected.'
            : 'Withdrawal marked as paid.',
    });
  } catch (error: any) {
    console.error('[Admin Withdrawals POST]', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed to update withdrawal' }, { status: 500 });
  }
}