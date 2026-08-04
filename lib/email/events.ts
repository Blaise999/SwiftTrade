/**
 * Branded event emails. One clean template for every event + a helper that
 * looks up the user's email by id and sends. Call emailUser(...) from any
 * route/trigger point so "every little thing gets an email".
 */
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const FROM = process.env.EMAIL_FROM || 'Swifttrade <noreply@swifttrade.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://swifttrade.app';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type EventEmail = {
  title: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  rows?: Array<{ label: string; value: string }>;   // optional detail table
  tone?: 'default' | 'success' | 'warning' | 'danger';
};

const TONE: Record<string, string> = {
  default: '#00C805', success: '#00C805', warning: '#F5A623', danger: '#FF4D3D',
};

export function eventEmailHtml(e: EventEmail): string {
  const accent = TONE[e.tone || 'default'] || '#00C805';
  const rows = (e.rows || []).map(r => `
    <tr>
      <td style="padding:8px 0;color:#8b8f9c;font-size:13px;">${r.label}</td>
      <td style="padding:8px 0;color:#eef0f4;font-size:13px;font-weight:600;text-align:right;">${r.value}</td>
    </tr>`).join('');

  const cta = e.ctaText && e.ctaUrl ? `
    <tr><td style="padding-top:8px;">
      <a href="${e.ctaUrl}" style="display:inline-block;background:${accent};color:#04140A;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:12px;font-size:14px;">${e.ctaText}</a>
    </td></tr>` : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e.title}</title></head>
<body style="margin:0;padding:0;background:#06070E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#06070E;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#0E1018;border:1px solid rgba(255,255,255,0.06);border-radius:20px;overflow:hidden;">
        <tr><td style="padding:22px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:18px;font-weight:800;color:#eef0f4;letter-spacing:-0.5px;">Swift<span style="color:${accent};">trade</span></span>
        </td></tr>
        <tr><td style="padding:26px 24px;">
          <div style="display:inline-block;width:40px;height:4px;border-radius:4px;background:${accent};margin-bottom:16px;"></div>
          <h1 style="margin:0 0 8px;color:#eef0f4;font-size:20px;font-weight:700;">${e.title}</h1>
          <p style="margin:0;color:#b7bcc8;font-size:14px;line-height:1.6;">${e.message}</p>
          ${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid rgba(255,255,255,0.06);">${rows}</table>` : ''}
          ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;">${cta}</table>` : ''}
        </td></tr>
        <tr><td style="padding:18px 24px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;color:#6b6f7c;font-size:11px;line-height:1.6;">
            You're receiving this because you have a Swifttrade account. Prices and trading involve risk.
            <br><a href="${APP_URL}/dashboard" style="color:${accent};text-decoration:none;">Open Swifttrade</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Send an event email to a user by id (looks up their email). Safe: never throws. */
export async function emailUser(userId: string, e: EventEmail): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY || !userId) return;
    const sb = admin();
    if (!sb) return;
    const { data: u } = await sb.from('users').select('email').eq('id', userId).maybeSingle();
    const to = (u as any)?.email;
    if (!to) return;
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: FROM, to: [to], subject: e.title, html: eventEmailHtml(e) });
  } catch { /* emails are best-effort — never block the action */ }
}

/** Send directly to an address (when you already have the email). */
export async function emailAddress(to: string, e: EventEmail): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY || !to) return;
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({ from: FROM, to: [to], subject: e.title, html: eventEmailHtml(e) });
  } catch { /* best-effort */ }
}
