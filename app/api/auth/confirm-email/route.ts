import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/confirm-email
 * Body: { email: string }
 *
 * Sets `email_confirmed_at` on the auth.users row so the user can sign in
 * without going through Supabase's own confirmation flow. Called after our
 * custom OTP verification, since the user has already proven email ownership
 * via OTP and shouldn't be asked to confirm twice.
 *
 * This requires the SERVICE_ROLE key (server-side only) — it should never be
 * exposed to the browser.
 *
 * Safe: it's a no-op if the user is already confirmed, and only ever sets
 * email_confirmed_at (never elevates roles or sets passwords).
 */
export async function POST(req: NextRequest) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'admin_not_configured', fallback: true },
        { status: 200 }
      );
    }
    const { email } = await req.json().catch(() => ({} as any));
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'email required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Look up the user
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (listErr) {
      return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
    }

    const user = list?.users?.find(u => (u.email || '').toLowerCase() === cleanEmail);
    if (!user) {
      // Not an error from the caller's perspective — nothing to confirm.
      return NextResponse.json({ ok: true, confirmed: false, reason: 'user not found' });
    }

    if (user.email_confirmed_at) {
      return NextResponse.json({ ok: true, confirmed: true, alreadyConfirmed: true });
    }

    // Confirm the email
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, confirmed: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
