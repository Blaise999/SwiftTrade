/**
 * GET /api/debug/whoami?userId=<the id your app is logged in as>
 *
 * The data saves fine — this proves WHICH user_id it saved under, and whether
 * that matches the id your session reads with. A mismatch here is the bug.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(req: NextRequest) {
  const sb = admin();
  if (!sb) return NextResponse.json({ error: 'service role not configured' }, { status: 503 });
  const userId = new URL(req.url).searchParams.get('userId') || '';

  const out: any = { queriedUserId: userId || '(none supplied)' };

  // What exists for THIS user
  if (userId) {
    const [{ data: pos }, { data: cp }, { data: utd }, { data: usr }] = await Promise.all([
      sb.from('positions').select('symbol, quantity, avg_entry_price').eq('user_id', userId),
      sb.from('crypto_positions').select('symbol, quantity, avg_buy_price').eq('user_id', userId),
      sb.from('user_trading_data').select('spot_crypto_state').eq('user_id', userId).maybeSingle(),
      sb.from('users').select('id, email, balance_available').eq('id', userId).maybeSingle(),
    ]);
    out.userRow = usr || null;
    out.stockPositions = pos || [];
    out.cryptoPositions = cp || [];
    out.spotCryptoStatePositions = (utd?.spot_crypto_state as any)?.positions ?? null;
    out.summary = {
      stocks: (pos || []).length,
      crypto: (cp || []).length,
      userExists: !!usr,
    };
  }

  // Every user_id that owns rows — compare against the id above
  const [{ data: allPos }, { data: allCp }] = await Promise.all([
    sb.from('positions').select('user_id, symbol'),
    sb.from('crypto_positions').select('user_id, symbol'),
  ]);
  const tally: Record<string, { stocks: string[]; crypto: string[] }> = {};
  for (const r of (allPos || []) as any[]) {
    tally[r.user_id] ||= { stocks: [], crypto: [] };
    tally[r.user_id].stocks.push(r.symbol);
  }
  for (const r of (allCp || []) as any[]) {
    tally[r.user_id] ||= { stocks: [], crypto: [] };
    tally[r.user_id].crypto.push(r.symbol);
  }
  out.holdingsByUserId = tally;
  out.verdict = userId
    ? (out.summary.stocks + out.summary.crypto > 0
        ? 'This user HAS holdings — if the app shows none, the page is querying a different id or failing to read.'
        : 'This user has NO holdings. Compare holdingsByUserId — your buys likely saved under a different user_id.')
    : 'Pass ?userId=<your logged-in id> to compare.';

  return NextResponse.json(out);
}
