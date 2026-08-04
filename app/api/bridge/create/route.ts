/**
 * SWIFTBRIDGE — Create new bureau-de-change request
 *
 * POST /api/bridge/create
 * Headers: x-user-id
 * Body: { country_code, country_name, local_currency, local_amount,
 *         target_asset, target_network?, fx_rate?, estimated_credit_usd? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireFeature } from '@/lib/tier-guard';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    {
      const _gate = await requireFeature(String(userId || ''), 'bridge');
      if (!_gate.ok) return NextResponse.json({ ok: false, error: _gate.error, code: 'TIER_REQUIRED' }, { status: _gate.status || 403 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const {
      country_code,
      country_name,
      local_currency,
      local_amount,
      target_asset,
      target_network,
      fx_rate,
      estimated_credit_usd,
      estimated_target,
    } = body || {};

    // Basic validation
    if (!country_code || !country_name || !local_currency || !local_amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const amount = parseFloat(local_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Look up country bounds
    const { data: country } = await supabaseAdmin
      .from('bridge_countries')
      .select('*')
      .eq('code', country_code)
      .maybeSingle();

    if (!country || !country.active) {
      return NextResponse.json({ error: 'Country not supported' }, { status: 400 });
    }
    if (amount < Number(country.min_local) || amount > Number(country.max_local)) {
      return NextResponse.json(
        { error: `Amount must be between ${country.min_local} and ${country.max_local} ${country.currency}` },
        { status: 400 },
      );
    }

    // Limit one open request per user at a time (optional safety)
    const { count: openCount } = await supabaseAdmin
      .from('bridge_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['awaiting_admin', 'awaiting_payment', 'awaiting_verification']);

    if ((openCount || 0) >= 3) {
      return NextResponse.json(
        { error: 'You already have 3 open bridge requests. Complete or cancel them first.' },
        { status: 429 },
      );
    }

    // Insert request
    const { data: request, error } = await supabaseAdmin
      .from('bridge_requests')
      .insert({
        user_id: userId,
        country_code,
        country_name,
        local_currency,
        local_amount: amount,
        target_asset: target_asset || 'USDT',
        target_network: target_network || null,
        fx_rate: fx_rate ? Number(fx_rate) : null,
        estimated_credit_usd: estimated_credit_usd ? Number(estimated_credit_usd) : null,
        estimated_usd: estimated_credit_usd ? Number(estimated_credit_usd) : null,
        estimated_target: estimated_target ? Number(estimated_target) : null,
        status: 'awaiting_admin',
      })
      .select('*')
      .single();

    if (error) {
      console.error('[bridge/create] DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // (Trigger fan_out_bridge_alert already inserts admin alert)
    // Best-effort: send admin email
    try {
      const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL;
      if (ADMIN_EMAIL) {
        const mail: any = await import('@/lib/email');
        if (typeof mail.sendEmail === 'function') {
          await mail.sendEmail({
            to: ADMIN_EMAIL,
            subject: `[SwiftBridge] New ${country_name} request — ${amount} ${local_currency}`,
            html: `<p>New bridge request from user <code>${userId}</code></p>
                   <p><strong>${amount} ${local_currency}</strong> from ${country_name} → ${target_asset}</p>
                   <p>Open: <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/admin/bridge">Admin Panel</a></p>`,
          }).catch(() => {});
        }
      }
    } catch {/* ignore */}

    return NextResponse.json({
      success: true,
      id: request.id,
      request,
    });
  } catch (err: any) {
    console.error('[bridge/create]', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
