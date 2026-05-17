import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

async function resolveFileUrl(supabaseAdmin: any, fileUrl: string | null) {
  if (!fileUrl) return null;

  const raw = String(fileUrl).trim();
  if (!raw) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  if (isAbsoluteUrl(raw)) return raw;

  if (raw.startsWith('/storage/v1/object/')) {
    return supabaseUrl ? `${supabaseUrl}${raw}` : raw;
  }

  if (raw.startsWith('storage/v1/object/')) {
    return supabaseUrl ? `${supabaseUrl}/${raw}` : `/${raw}`;
  }

  const bucket = process.env.KYC_STORAGE_BUCKET || 'kyc-documents';
  let objectPath = raw.replace(/^\/+/, '');

  if (objectPath.startsWith(`${bucket}/`)) {
    objectPath = objectPath.slice(bucket.length + 1);
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(objectPath, 60 * 60);

  if (error) {
    console.error('[AdminUserKyc] signed url error:', error);
    return null;
  }

  return data?.signedUrl || null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const userId = params.id;

    const { data: user, error: userError } = await auth.supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        kyc_status,
        kyc_level,
        kyc_submitted_at,
        kyc_reviewed_at,
        kyc_reviewer_id,
        kyc_reviewed_by,
        kyc_rejection_reason,
        kyc_data
      `)
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const { data: documents, error: documentsError } = await auth.supabaseAdmin
      .from('kyc_documents')
      .select(`
        id,
        user_id,
        document_type,
        file_url,
        file_name,
        file_size,
        mime_type,
        status,
        rejection_reason,
        reviewed_by,
        reviewed_at,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (documentsError) throw documentsError;

    const resolvedDocuments = await Promise.all(
      (documents || []).map(async (doc: any) => ({
        ...doc,
        resolved_url: await resolveFileUrl(auth.supabaseAdmin, doc.file_url),
      }))
    );

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        kyc_status: user.kyc_status,
        kyc_level: user.kyc_level,
        kyc_submitted_at: user.kyc_submitted_at,
        kyc_reviewed_at: user.kyc_reviewed_at,
        kyc_rejection_reason: user.kyc_rejection_reason,
        kyc_reviewer_id: user.kyc_reviewer_id || user.kyc_reviewed_by || null,
      },
      kyc_data: user.kyc_data || {},
      documents: resolvedDocuments,
    });
  } catch (e: any) {
    console.error('[AdminUserKyc] GET error:', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to load KYC details' },
      { status: 500 }
    );
  }
}