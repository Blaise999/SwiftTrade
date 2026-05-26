// app/api/auth/admin-signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Helper to check if Supabase Admin (service role) is configured.
 */
const isAdminConfigured = (): boolean => {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
};

/**
 * POST /api/auth/admin-signup
 * Body: { email, password, firstName?, lastName? }
 */
export async function POST(req: NextRequest) {
  try {
    if (!isAdminConfigured()) {
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
      return NextResponse.json(
        { ok: false, error: 'email and password required' },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: 'password too short' },
        { status: 400 }
      );
    }

    // 1. Check if user already exists
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    const existing = list?.users?.find(
      // Fixed: explicit type to resolve "Parameter 'u' implicitly has an 'any' type"
      (u: { email?: string | null }) =>
        (u.email || '').toLowerCase() === email
    );

    let userId: string;

    if (existing) {
      // User exists → update password and re-confirm
      userId = existing.id;
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        {
          password,
          email_confirm: true,
          user_metadata: { first_name: firstName, last_name: lastName },
        }
      );

      if (updErr) {
        return NextResponse.json(
          { ok: false, error: updErr.message },
          { status: 500 }
        );
      }
    } else {
      // 2. Create new user
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
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

    // 3. Upsert into public.users table
    const { error: upsertErr } = await supabaseAdmin
      .from('users')
      .upsert(
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
      console.warn('[admin-signup] users upsert failed:', upsertErr.message);
    }

    return NextResponse.json({ ok: true, userId });
  } catch (err: any) {
    console.error('[admin-signup] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}