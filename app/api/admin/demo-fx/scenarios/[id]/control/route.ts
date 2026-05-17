/**
 * ADMIN DEMO FX SCENARIO CONTROL
 * POST /api/admin/demo-fx/scenarios/[id]/control
 *
 * Actions: start, pause, resume, stop, schedule
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: scenarioId } = await ctx.params;

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const { action, scheduled_at } = body;

  if (!['start', 'pause', 'resume', 'stop', 'schedule'].includes(action)) {
    return NextResponse.json(
      { error: 'Invalid action. Use: start, pause, resume, stop, schedule' },
      { status: 400 }
    );
  }

  // Fetch scenario with steps
  const { data: scenario, error: fetchErr } = await auth.supabaseAdmin
    .from('demo_fx_scenarios')
    .select('*, demo_fx_scenario_steps(count)')
    .eq('id', scenarioId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 400 });
  }

  if (!scenario) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
  }

  const now = new Date().toISOString();
  let updates: Record<string, any> = {};
  let pairUpdates: Record<string, any> = {};

  switch (action) {
    case 'start': {
      if (scenario.status === 'running') {
        return NextResponse.json(
          { error: 'Scenario already running' },
          { status: 400 }
        );
      }

      updates = {
        status: 'running',
        started_at: now,
        paused_at: null,
        completed_at: null,
        elapsed_ms: 0,
        current_step_index: 0,
      };

      pairUpdates = {
        mode: 'scenario',
        active_scenario_id: scenarioId,
      };

      // Set initial prices from first step
      const { data: firstStep } = await auth.supabaseAdmin
        .from('demo_fx_scenario_steps')
        .select('target_bid, target_ask')
        .eq('scenario_id', scenarioId)
        .order('step_index', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstStep) {
        pairUpdates.current_bid = firstStep.target_bid;
        pairUpdates.current_ask = firstStep.target_ask;
        pairUpdates.price_updated_at = now;
      }

      break;
    }

    case 'pause': {
      if (scenario.status !== 'running') {
        return NextResponse.json(
          { error: 'Can only pause a running scenario' },
          { status: 400 }
        );
      }

      const startedAt = new Date(scenario.started_at).getTime();
      const accumulated = scenario.elapsed_ms || 0;
      const totalElapsed = accumulated + (Date.now() - startedAt);

      updates = {
        status: 'paused',
        paused_at: now,
        elapsed_ms: totalElapsed,
      };

      break;
    }

    case 'resume': {
      if (scenario.status !== 'paused') {
        return NextResponse.json(
          { error: 'Can only resume a paused scenario' },
          { status: 400 }
        );
      }

      updates = {
        status: 'running',
        started_at: now,
        paused_at: null,
      };

      pairUpdates = {
        mode: 'scenario',
        active_scenario_id: scenarioId,
      };

      break;
    }

    case 'stop': {
      if (
        scenario.status !== 'running' &&
        scenario.status !== 'paused' &&
        scenario.status !== 'scheduled'
      ) {
        return NextResponse.json({ error: 'Nothing to stop' }, { status: 400 });
      }

      updates = {
        status: 'stopped',
        completed_at: now,
      };

      pairUpdates = {
        mode: 'manual',
        active_scenario_id: null,
      };

      break;
    }

    case 'schedule': {
      if (!scheduled_at) {
        return NextResponse.json(
          { error: 'scheduled_at required for schedule action' },
          { status: 400 }
        );
      }

      updates = {
        status: 'scheduled',
        scheduled_at,
        started_at: null,
        paused_at: null,
        completed_at: null,
        elapsed_ms: 0,
        current_step_index: 0,
      };

      break;
    }
  }

  // Update scenario
  const { data: updated, error: upErr } = await auth.supabaseAdmin
    .from('demo_fx_scenarios')
    .update(updates)
    .eq('id', scenarioId)
    .select('*')
    .single();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  // Update pair if needed
  if (Object.keys(pairUpdates).length > 0) {
    await auth.supabaseAdmin
      .from('demo_fx_pairs')
      .update(pairUpdates)
      .eq('id', scenario.pair_id);
  }

  // Audit
  try {
    await auth.supabaseAdmin.from('admin_audit_log').insert({
      admin_id: auth.adminId,
      action: `demo_fx_scenario_${action}`,
      meta: { scenario_id: scenarioId, pair_id: scenario.pair_id },
      created_at: now,
    });
  } catch {
    // intentionally ignore audit log failures
  }

  return NextResponse.json({ scenario: updated, action });
}