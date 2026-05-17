/**
 * SWIFTBRIDGE — User uploads proof of local payment
 *
 * POST /api/bridge/upload-proof
 * Headers: x-user-id
 * FormData: { file, request_id }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const requestId = formData.get('request_id') as string | null;

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
    if (!requestId) return NextResponse.json({ error: 'request_id required' }, { status: 400 });

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    }
    if (file.type && !ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    // Confirm the request belongs to this user
    const { data: request } = await supabaseAdmin
      .from('bridge_requests')
      .select('id, user_id, status')
      .eq('id', requestId)
      .maybeSingle();

    if (!request || request.user_id !== userId) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (!['awaiting_payment', 'awaiting_verification'].includes(request.status)) {
      return NextResponse.json({ error: 'This request is not awaiting proof.' }, { status: 400 });
    }

    // Upload to bridge-proofs bucket under userId/requestId/timestamp.<ext>
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${userId}/${requestId}/${Date.now()}.${ext || 'bin'}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabaseAdmin
      .storage
      .from('bridge-proofs')
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (upErr) {
      console.error('[bridge/upload-proof] upload error:', upErr);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    // Update request -> awaiting_verification
    const { data: updated, error: updErr } = await supabaseAdmin
      .from('bridge_requests')
      .update({
        proof_url: path,
        proof_uploaded_at: new Date().toISOString(),
        status: 'awaiting_verification',
      })
      .eq('id', requestId)
      .select('*')
      .single();

    if (updErr) {
      console.error('[bridge/upload-proof] update error:', updErr);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    // Notify admins
    await supabaseAdmin.from('admin_alerts').insert({
      type: 'bridge.proof',
      title: 'SwiftBridge — proof uploaded',
      body: 'A user uploaded payment proof. Verify and credit.',
      data: { request_id: requestId, user_id: userId },
    });

    return NextResponse.json({ success: true, request: updated });
  } catch (err: any) {
    console.error('[bridge/upload-proof]', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}

// App Router: body parsing is handled automatically. Keep dynamic so
// uploads bypass static generation.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
