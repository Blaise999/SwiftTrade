/**
 * ADMIN SIGNAL CREATOR v2
 * POST /api/admin/demo-fx/create-signal
 *
 * Admin sends: { pair_id, direction, profit_percent, duration_minutes, entry_time? }
 *
 * entry_time is optional — format "HH:MM" (e.g., "10:15").
 * If given, the Telegram message tells users to enter at that time.
 * The session starts immediately so candles are already building when users arrive.
 *
 * If not given, it says "NOW".
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { seedHistoricalCandles, repriceOpenDemoTradesForPair } from '@/lib/demo-fx/reprice-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: any = {};
  try { body = await req.json(); } catch {}

  const { pair_id, direction, profit_percent, duration_minutes, entry_time, custom_message } = body;

  if (!pair_id) return NextResponse.json({ error: 'Pick a pair' }, { status: 400 });
  if (!direction || !['buy', 'sell'].includes(direction)) return NextResponse.json({ error: 'Pick buy or sell' }, { status: 400 });

  const profitPct = Number(profit_percent);
  if (!profitPct || profitPct <= 0 || profitPct > 1000) return NextResponse.json({ error: 'Profit % must be 1-1000' }, { status: 400 });

  const durMin = Number(duration_minutes) || 5;
  if (durMin < 1 || durMin > 60) return NextResponse.json({ error: 'Duration must be 1-60 minutes' }, { status: 400 });

  // Get current pair
  const { data: pair } = await auth.supabaseAdmin
    .from('demo_fx_pairs').select('*').eq('id', pair_id).maybeSingle();
  if (!pair) return NextResponse.json({ error: 'Pair not found' }, { status: 404 });

  const currentBid = Number(pair.current_bid);
  const currentAsk = Number(pair.current_ask);
  const spread = Math.abs(currentAsk - currentBid);
  if (currentBid <= 0) return NextResponse.json({ error: 'Pair has no price yet. Override price first.' }, { status: 400 });

  // Calculate target
  // profit = direction * investment * multiplier * ((mark - entry) / entry)
  // For x100: profit_pct/100 = 100 * ((mark - entry) / entry)
  // → price_move_pct = profit_pct / 10000
  const priceMovePct = profitPct / 10000;

  let targetBid: number, targetAsk: number, sessionType: string;

  if (direction === 'buy') {
    const entry = currentAsk;
    const targetMark = entry * (1 + priceMovePct);
    targetBid = Number(targetMark.toFixed(6));
    targetAsk = Number((targetMark + spread).toFixed(6));
    sessionType = 'bullish';
  } else {
    const entry = currentBid;
    const targetMark = entry * (1 - priceMovePct);
    targetAsk = Number(targetMark.toFixed(6));
    targetBid = Number((targetMark - spread).toFixed(6));
    sessionType = 'bearish';
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const durationMs = durMin * 60 * 1000;

  // Stop any existing session
  await auth.supabaseAdmin
    .from('demo_fx_sessions')
    .update({ status: 'stopped', completed_at: nowIso })
    .eq('pair_id', pair_id)
    .in('status', ['running', 'paused']);

  // Clean old SESSION candles/ticks (NOT background null-session candles — those are chart history)
  try {
    // Delete candles from old stopped sessions only
    await auth.supabaseAdmin.from('demo_fx_candles')
      .delete().eq('pair_id', pair_id).not('session_id', 'is', null);
    await auth.supabaseAdmin.from('demo_fx_ticks')
      .delete().eq('pair_id', pair_id).not('session_id', 'is', null);
  } catch {}

  // Create session
  const instructions = `${direction.toUpperCase()} with x100 multiplier. Target: +${profitPct}% in ${durMin}min.`;
  const { data: session, error: sessErr } = await auth.supabaseAdmin
    .from('demo_fx_sessions')
    .insert({
      pair_id, session_type: sessionType, duration_ms: durationMs,
      tick_interval_ms: 1000, volatility: Number(pair.spread) || 0.0008,
      start_bid: currentBid, start_ask: currentAsk,
      target_bid: targetBid, target_ask: targetAsk,
      status: 'running', started_at: nowIso, elapsed_ms: 0, tick_seq: 0,
      student_instructions: instructions, created_by: auth.adminId,
    })
    .select('*').single();

  if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 400 });

  // Update pair
  await auth.supabaseAdmin.from('demo_fx_pairs').update({
    mode: 'session', active_session_id: session.id,
    current_bid: currentBid, current_ask: currentAsk,
    seq: 0, price_updated_at: nowIso,
  }).eq('id', pair_id);

  // Seed candles + initial tick
  await seedHistoricalCandles(auth.supabaseAdmin, pair_id, session.id, currentBid, currentAsk);
  const mid = (currentBid + currentAsk) / 2;
  await auth.supabaseAdmin.from('demo_fx_ticks').insert({
    pair_id, session_id: session.id, bid: currentBid, ask: currentAsk, mid,
    source: 'session', seq: 0, ts: nowIso,
  });

  // Reprice any existing open trades
  await repriceOpenDemoTradesForPair(auth.supabaseAdmin, pair_id, currentBid, currentAsk);

  // ─── BUILD TELEGRAM MESSAGE ──────────────────────────────────────────
  const dir = direction.toUpperCase();
  const emoji = dir === 'BUY' ? '🟢' : '🔴';
  const arrow = dir === 'BUY' ? '📈' : '📉';

  // Time display
  let timeStr: string;
  if (entry_time && /^\d{1,2}:\d{2}$/.test(entry_time)) {
    timeStr = entry_time;
  } else {
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    timeStr = `${h}:${m}`;
  }

  const entryPrice = direction === 'buy' ? currentAsk : currentBid;
  const targetDisplay = direction === 'buy' ? targetBid : targetAsk;

  // Investment examples
  const examples = [
    { inv: 50, profit: (50 * profitPct / 100).toFixed(0) },
    { inv: 100, profit: (100 * profitPct / 100).toFixed(0) },
    { inv: 500, profit: (500 * profitPct / 100).toFixed(0) },
  ];

  const tgMessage = custom_message || [
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `${emoji} *SIGNAL ALERT* ${emoji}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `${arrow} *${dir} ${pair.symbol}*`,
    ``,
    `⏰ *Enter at: ${timeStr}*`,
    `⏱ Hold for: *${durMin} minute${durMin > 1 ? 's' : ''}*`,
    `💰 Expected return: *+${profitPct}%*`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `📱 *Instructions:*`,
    ``,
    `1️⃣ Open the app`,
    `2️⃣ Go to *Trade → Forex*`,
    `3️⃣ Select *${pair.symbol}*`,
    `4️⃣ Set multiplier to *x100*`,
    `5️⃣ Tap *${dir}* at exactly *${timeStr}*`,
    `6️⃣ Close after ${durMin} minute${durMin > 1 ? 's' : ''}`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `💵 *Profit Calculator:*`,
    ``,
    ...examples.map(e => `• $${e.inv} → *+$${e.profit}* profit`),
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `✅ Signal is *LIVE* for ${durMin} minutes`,
    `⚠️ Trade what you can afford`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
  ].join('\n');

  // Send to Telegram
  let tgSent = false;
  try {
    const { data: tgRow } = await auth.supabaseAdmin
      .from('admin_settings').select('value').eq('key', 'telegram_config').maybeSingle();
    if (tgRow?.value) {
      const cfg = typeof tgRow.value === 'string' ? JSON.parse(tgRow.value) : tgRow.value;
      if (cfg.bot_token && cfg.chat_id) {
        const res = await fetch(`https://api.telegram.org/bot${cfg.bot_token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cfg.chat_id, text: tgMessage,
            parse_mode: 'Markdown', disable_web_page_preview: true,
          }),
        });
        tgSent = (await res.json()).ok === true;
      }
    }
  } catch {}

  // Audit
  try {
    await auth.supabaseAdmin.from('admin_audit_log').insert({
      admin_id: auth.adminId, action: 'signal_created',
      meta: { pair_id, direction, profit_percent: profitPct, duration_minutes: durMin,
              entry_time: timeStr, session_id: session.id, telegram_sent: tgSent },
      created_at: nowIso,
    });
  } catch {}

  return NextResponse.json({
    success: true,
    signal: {
      session_id: session.id, pair: pair.symbol, direction,
      profit_percent: profitPct, duration_minutes: durMin,
      entry_time: timeStr,
      entry_price: Number(entryPrice.toFixed(6)),
      target_price: Number(targetDisplay.toFixed(6)),
      telegram_sent: tgSent, telegram_message: tgMessage,
    },
  });
}
