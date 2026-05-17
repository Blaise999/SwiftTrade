export default function Loading() {
  return (
    <div className="space-y-4 pb-12 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-32 h-9 rounded-lg bg-charcoal/50 border border-pearl-100/[0.05]" />
        <div className="w-24 h-9 rounded-lg bg-charcoal/50 border border-pearl-100/[0.05]" />
      </div>
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 h-[480px] rounded-2xl bg-charcoal/40 border border-pearl-100/[0.06] flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full border-2 border-sapphire-500/30 border-t-sapphire-400 animate-spin mx-auto mb-3" />
            <div className="text-[11px] uppercase tracking-[0.3em] text-pearl-300/55">Loading chart</div>
          </div>
        </div>
        <div className="lg:col-span-4 space-y-3">
          <div className="h-[200px] rounded-xl bg-charcoal/40 border border-pearl-100/[0.06]" />
          <div className="h-[260px] rounded-xl bg-charcoal/40 border border-pearl-100/[0.06]" />
        </div>
      </div>
      <div className="h-[300px] rounded-xl bg-charcoal/40 border border-pearl-100/[0.06]" />
    </div>
  );
}
