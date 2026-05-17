export default function Loading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      <div className="h-12 rounded-xl bg-charcoal/50 border border-pearl-100/[0.05]" />
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 h-[280px] rounded-2xl bg-charcoal/40 border border-pearl-100/[0.06]" />
        <div className="lg:col-span-5 grid grid-cols-2 gap-3">
          <div className="h-[100px] rounded-xl bg-charcoal/40 border border-pearl-100/[0.06]" />
          <div className="h-[100px] rounded-xl bg-charcoal/40 border border-pearl-100/[0.06]" />
          <div className="h-[100px] rounded-xl bg-charcoal/40 border border-pearl-100/[0.06] col-span-2" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-[120px] rounded-xl bg-charcoal/40 border border-pearl-100/[0.06]" />
        ))}
      </div>
    </div>
  );
}
