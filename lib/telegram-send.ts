import { createClient } from '@supabase/supabase-js';

/**
 * Sends a message to the configured Telegram group.
 * Reuses the bot_token + chat_id saved via the admin Telegram config
 * (platform_settings key = 'telegram_config').
 */
export async function sendTelegram(message: string): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, error: 'service role not configured' };

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await sb.from('platform_settings').select('value').eq('key', 'telegram_config').maybeSingle();
  const cfg: any = data?.value || {};
  const token = cfg.bot_token;
  const chat = cfg.chat_id;
  if (!token || !chat) return { ok: false, error: 'Telegram not configured (set it in Admin → Telegram)' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: message, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    const j = await res.json();
    return j.ok ? { ok: true } : { ok: false, error: j.description || 'Telegram send failed' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Telegram request failed' };
  }
}
