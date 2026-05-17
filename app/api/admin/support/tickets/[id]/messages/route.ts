/**
 * ADMIN SUPPORT TICKET MESSAGES
 *
 * GET  /api/admin/support/tickets/[id]/messages — list messages
 * POST /api/admin/support/tickets/[id]/messages — send admin reply
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────
// GET — fetch messages for a ticket
// ─────────────────────────────────────────────
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: ticketId } = await ctx.params;
  if (!ticketId) return NextResponse.json({ error: 'Missing ticket id' }, { status: 400 });

  try {
    const { data: messages, error } = await auth.supabaseAdmin
      .from('support_messages')
      .select('id, ticket_id, sender_id, sender_type, message, attachments, read_at, created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Mark user messages as read by admin
    void auth.supabaseAdmin
      .from('support_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('ticket_id', ticketId)
      .eq('sender_type', 'user')
      .is('read_at', null);

    return NextResponse.json({ messages: messages || [] });
  } catch (e: any) {
    console.error('[AdminSupport] getMessages error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to load messages' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST — send admin reply
// ─────────────────────────────────────────────
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: ticketId } = await ctx.params;

  try {
    const body = await request.json().catch(() => ({}));
    const text = String(body?.message ?? '').trim();
    const attachments = Array.isArray(body?.attachments) ? body.attachments : null;

    if (!text) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    // sender_id ALWAYS from server session (never from client)
    const { data, error } = await auth.supabaseAdmin
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'admin',
        sender_id: auth.adminId,
        message: text,
        attachments,
      })
      .select('id,ticket_id,sender_id,sender_type,message,attachments,read_at,created_at')
      .single();

    if (error) throw error;

    await auth.supabaseAdmin
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString(), status: 'waiting_user' })
      .eq('id', ticketId);

    return NextResponse.json({ message: data }, { status: 201 });
  } catch (e: any) {
    console.error('[AdminSupport] send message error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to send message' }, { status: 500 });
  }
}
