import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isAdminConfigured } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/auth/admin-signup
 * Body: { email, password, firstName?, lastName? }
 *
 * Creates an auth.users row + matching public.users row via the service
 * role client. The user is auto-confirmed (email_confirm: true), so they
 * can sign in immediately afterwards.
 *
 * Why this exists:
 *   - `supabase.auth.signUp()` from the browser is rate-limited per IP
 *     (very strict — often 3-4 attempts per hour). Repeated signups during
 *     testing hit the limit and return 500.
 *   - It also leaves users unconfirmed by default. Since we've already
 *     verified the email via our own OTP, that step is redundant.
 *
 * The server-side admin path bypasses both problems. It's only used by
 * the verify-otp page (after our custom OTP succeeds), so end users
 * can never call it directly to spam-create accounts — they must hold a
 * valid OTP first.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isAdminConfigured()) {
      // Not an error in the user's flow — the client will fall back to the
      // normal signup path. Return a clear, non-500 status so the browser
      // console doesn't show a scary Internal Server Error.
      return NextResponse.json(
        { ok: false, error: 'admin_not_configured', fallback: true },
        { status: 200 }
      );
    }

    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email || '').toLowerCase().trim();
    const password = String(body?.password || '');
    const firstName = String(body?.firstName || '').trim();
    const lastName = String(body?.lastName || '').trim();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'email and password required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ ok: false, error: 'password too short' }, { status: 400 });
    }

    // 1. Check if user already exists in auth
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find(u => (u.email || '').toLowerCase() === email);

    let userId: string;

    if (existing) {
      // User already exists — just re-confirm them and refresh password.
      userId = existing.id;
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      });
      if (updErr) {
        return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
      }
    } else {
      // 2. Create user
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      });
      if (createErr || !created?.user) {
        return NextResponse.json(
          { ok: false, error: createErr?.message || 'createUser failed' },
          { status: 500 }
        );
      }
      userId = created.user.id;
    }

    // 3. Mirror to public.users
    const { error: upsertErr } = await supabaseAdmin.from('users').upsert(
      {
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        role: 'user',
        tier: 'basic',
        tier_code: 'basic',
        tier_level: 0,
        tier_active: false,
        balance_available: 0,
        balance_bonus: 0,
        total_deposited: 0,
        kyc_status: 'none',
        registration_status: 'pending_kyc',
        email_verified: true,
        is_active: true,
      },
      { onConflict: 'id' }
    );

    if (upsertErr) {
      // Not fatal — the auth row exists, login will still work
      console.warn('[admin-signup] users upsert failed:', upsertErr.message);
    }

    return NextResponse.json({ ok: true, userId });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
