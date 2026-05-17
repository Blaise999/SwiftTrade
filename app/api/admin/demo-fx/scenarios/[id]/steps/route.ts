/**
 * ADMIN DEMO FX SCENARIO STEPS API
 * GET  - List steps for a scenario
 * POST - Add/replace all steps (bulk upsert)
 * PUT  - Update a single step
 * DELETE - Delete a step
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: scenarioId } = await ctx.params;

  const { data: steps, error } = await auth.supabaseAdmin
    .from('demo_fx_scenario_steps')
    .select('*')
    .eq('scenario_id', scenarioId)
    .order('step_index', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ steps });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: scenarioId } = await ctx.params;
  let body: any = {};
  try { body = await req.json(); } catch {}

  const { steps } = body;
  if (!Array.isArray(steps) || steps.length === 0) {
    return NextResponse.json({ error: 'steps array is required' }, { status: 400 });
  }

  // Validate steps
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (typeof s.offset_ms !== 'number' || s.offset_ms < 0) {
      return NextResponse.json({ error: `Step ${i}: invalid offset_ms` }, { status: 400 });
    }
    if (typeof s.target_bid !== 'number' || s.target_bid <= 0) {
      return NextResponse.json({ error: `Step ${i}: invalid target_bid` }, { status: 400 });
    }
    if (typeof s.target_ask !== 'number' || s.target_ask <= 0) {
      return NextResponse.json({ error: `Step ${i}: invalid target_ask` }, { status: 400 });
    }
  }

  // Delete existing steps
  await auth.supabaseAdmin
    .from('demo_fx_scenario_steps')
    .delete()
    .eq('scenario_id', scenarioId);

  // Insert new steps
  const rows = steps.map((s: any, i: number) => ({
    scenario_id: scenarioId,
    step_index: i,
    offset_ms: s.offset_ms,
    target_bid: s.target_bid,
    target_ask: s.target_ask,
    easing: s.easing || 'linear',
    label: s.label || null,
  }));

  const { data: inserted, error } = await auth.supabaseAdmin
    .from('demo_fx_scenario_steps')
    .insert(rows)
    .select('*');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ steps: inserted });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const stepId = searchParams.get('step_id');
  if (!stepId) return NextResponse.json({ error: 'Missing step_id' }, { status: 400 });

  const { error } = await auth.supabaseAdmin
    .from('demo_fx_scenario_steps')
    .delete()
    .eq('id', stepId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
