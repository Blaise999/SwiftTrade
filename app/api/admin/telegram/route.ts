/**
 * ADMIN TELEGRAM BOT API
 * GET  - Fetch saved bot config
 * POST - Save bot config (token + chat_id) OR send a message
 *
 * Body for save: { action: 'save_config', bot_token, chat_id }
 * Body for send: { action: 'send', message }
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── GET: Fetch saved telegram config ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: row } = await auth.supabaseAdmin
    .from('admin_settings')
    .select('key, value')
    .eq('key', 'telegram_config')
    .maybeSingle();

  if (!row) return NextResponse.json({ config: null });

  let config: any = {};
  try { config = typeof row.value === 'string' ? JSON.parse(row.value) : row.value; } catch {}

  // Mask the token for security
  const masked = config.bot_token
    ? config.bot_token.slice(0, 6) + '...' + config.bot_token.slice(-4)
    : '';

  return NextResponse.json({
    config: {
      bot_token_masked: masked,
      chat_id: config.chat_id || '',
      has_token: !!config.bot_token,
    },
  });
}

// ─── POST: Save config or send message ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: any = {};
  try { body = await req.json(); } catch {}

  const action = body.action || 'send';

  // ── SAVE CONFIG ──────────────────────────────────────────────────────────
  if (action === 'save_config') {
    const { bot_token, chat_id } = body;
    if (!bot_token) return NextResponse.json({ error: 'Missing bot_token' }, { status: 400 });
    if (!chat_id) return NextResponse.json({ error: 'Missing chat_id' }, { status: 400 });

    // Validate token format (roughly: digits:alphanumeric)
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(bot_token.trim())) {
      return NextResponse.json({ error: 'Invalid bot token format' }, { status: 400 });
    }

    // Test the bot token by calling getMe
    try {
      const testRes = await fetch(`https://api.telegram.org/bot${bot_token.trim()}/getMe`);
      const testJson = await testRes.json();
      if (!testJson.ok) {
        return NextResponse.json({ error: `Bot token invalid: ${testJson.description || 'getMe failed'}` }, { status: 400 });
      }
    } catch (e: any) {
      return NextResponse.json({ error: `Cannot reach Telegram API: ${e.message}` }, { status: 400 });
    }

    const configValue = JSON.stringify({
      bot_token: bot_token.trim(),
      chat_id: String(chat_id).trim(),
    });

    // Upsert into admin_settings
    const { data: existing } = await auth.supabaseAdmin
      .from('admin_settings')
      .select('id')
      .eq('key', 'telegram_config')
      .maybeSingle();

    if (existing) {
      await auth.supabaseAdmin
        .from('admin_settings')
        .update({ value: configValue, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await auth.supabaseAdmin
        .from('admin_settings')
        .insert({ key: 'telegram_config', value: configValue });
    }

    // Audit
    try {
      await auth.supabaseAdmin.from('admin_audit_log').insert({
        admin_id: auth.adminId,
        action: 'telegram_config_saved',
        meta: { chat_id: String(chat_id).trim() },
        created_at: new Date().toISOString(),
      });
    } catch {}

    return NextResponse.json({ success: true, message: 'Telegram config saved' });
  }

  // ── SEND MESSAGE ─────────────────────────────────────────────────────────
  if (action === 'send') {
    const { message } = body;
    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    // Load config
    const { data: row } = await auth.supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'telegram_config')
      .maybeSingle();

    if (!row) {
      return NextResponse.json({ error: 'Telegram bot not configured. Go to Settings → Telegram.' }, { status: 400 });
    }

    let config: any = {};
    try { config = typeof row.value === 'string' ? JSON.parse(row.value) : row.value; } catch {}

    if (!config.bot_token || !config.chat_id) {
      return NextResponse.json({ error: 'Bot token or chat ID missing. Go to Settings → Telegram.' }, { status: 400 });
    }

    // Send via Telegram Bot API
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chat_id,
          text: String(message).trim(),
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      });

      const tgJson = await tgRes.json();

      if (!tgJson.ok) {
        return NextResponse.json({
          error: `Telegram error: ${tgJson.description || 'sendMessage failed'}`,
        }, { status: 400 });
      }

      // Audit
      try {
        await auth.supabaseAdmin.from('admin_audit_log').insert({
          admin_id: auth.adminId,
          action: 'telegram_message_sent',
          meta: { chat_id: config.chat_id, message_length: message.length },
          created_at: new Date().toISOString(),
        });
      } catch {}

      return NextResponse.json({
        success: true,
        message_id: tgJson.result?.message_id,
      });
    } catch (e: any) {
      return NextResponse.json({ error: `Telegram send failed: ${e.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
