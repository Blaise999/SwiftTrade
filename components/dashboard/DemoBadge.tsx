'use client';

/**
 * DemoBadge — persistent "Simulation" marker.
 *
 * Put this in the dashboard layout (app/dashboard/layout.tsx) so it renders on
 * EVERY screen, not just the home dashboard. Sponsors are the sharpest audience
 * you'll show this to; a badge that's honest and everywhere reads as "I know
 * exactly what I'm building toward," which is far more fundable than a hidden
 * label that looks like you were hoping nobody would notice.
 *
 * Toggle globally with NEXT_PUBLIC_DEMO_MODE=false once the ledger is backed by
 * real, licensed money movement.
 */

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export function DemoBadge() {
  if (!DEMO_MODE) return null;

  return (
    <div
      role="status"
      aria-label="Demo mode: balances and trades are simulated"
      className="fixed bottom-4 left-4 z-[60] flex items-center gap-2 rounded-full
                 border border-amber-400/40 bg-amber-500/10 px-3 py-1.5
                 text-xs font-medium text-amber-300 backdrop-blur
                 shadow-[0_0_20px_-6px_rgba(245,158,11,0.5)]
                 select-none pointer-events-none"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
      </span>
      Demo &middot; simulated balances
    </div>
  );
}

export default DemoBadge;
