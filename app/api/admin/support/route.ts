/**
 * ADMIN SUPPORT TICKET BY ID (legacy route)
 *
 * GET /api/admin/support/[id] — fetch ticket with messages
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Missing ticket id' }, { status: 400 });

  const { data: ticket, error: te } = await auth.supabaseAdmin
    .from('support_tickets')
    .select(`
      *,
      users:user_id ( id, email, first_name, last_name )
    `)
    .eq('id', id)
    .single();

  if (te || !ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  const { data: messages, error: me } = await auth.supabaseAdmin
    .from('support_messages')
    .select('id, ticket_id, sender_id, sender_type, message, attachments, read_at, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })
    .limit(500);

  if (me) return NextResponse.json({ error: me.message }, { status: 500 });

  return NextResponse.json({ ticket, messages: messages ?? [] });
}
