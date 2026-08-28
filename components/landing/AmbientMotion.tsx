'use client';

/**
 * Pure-CSS ambient motion. No image or video assets required — animated
 * mesh-gradient blobs that drift behind a section. If you later drop a WebP
 * at `src`, it layers on top of the CSS motion automatically.
 *
 * Every variant respects prefers-reduced-motion.
 */
export function AmbientMotion({
  variant = 'mesh',
  tone = 'green',
  opacity = 0.5,
  src,
  className = '',
}: {
  variant?: 'mesh' | 'grid' | 'orbit' | 'scan' | 'ticker' | 'candles' | 'flow' | 'noise' | 'rays';
  tone?: 'green' | 'gold' | 'violet' | 'mixed';
  opacity?: number;
  src?: string;
  className?: string;
}) {
  const TONES: Record<string, [string, string, string]> = {
    green:  ['var(--profit)', '#0FB37A', '#0A5F44'],
    gold:   ['var(--gold)', '#E4C883', '#7A5F2A'],
    violet: ['#7C5CFC', '#A78BFA', '#4C3A9E'],
    mixed:  ['var(--profit)', '#7C5CFC', 'var(--gold)'],
  };
  const [c1, c2, c3] = TONES[tone] || TONES.green;

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ opacity }}>
      {variant === 'mesh' && (
        <>
          <span className="swift-blob swift-blob-a" style={{ background: c1 }} />
          <span className="swift-blob swift-blob-b" style={{ background: c2 }} />
          <span className="swift-blob swift-blob-c" style={{ background: c3 }} />
        </>
      )}

      {variant === 'grid' && (
        <div className="swift-grid absolute inset-0" style={{ ['--g' as any]: c1 }} />
      )}

      {variant === 'orbit' && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="swift-orbit" style={{ borderColor: `color-mix(in srgb, ${c1} 45%, transparent)` }} />
          <span className="swift-orbit swift-orbit-2" style={{ borderColor: `color-mix(in srgb, ${c2} 35%, transparent)` }} />
          <span className="swift-orbit swift-orbit-3" style={{ borderColor: `color-mix(in srgb, ${c3} 30%, transparent)` }} />
        </div>
      )}

      {variant === 'scan' && (
        <div className="swift-scan absolute inset-0" style={{ ['--s' as any]: c1 }} />
      )}

      {variant === 'ticker' && (
        <div className="absolute inset-0 flex flex-col justify-around">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="swift-tape" style={{
              ['--tape' as any]: i % 2 ? c2 : c1,
              animationDuration: `${26 + i * 7}s`,
              animationDirection: i % 2 ? 'reverse' : 'normal',
            }} />
          ))}
        </div>
      )}

      {variant === 'candles' && (
        <div className="absolute inset-0 flex items-end justify-center gap-[6px] px-8 pb-10">
          {Array.from({ length: 26 }).map((_, i) => (
            <span key={i} className="swift-candle" style={{
              background: i % 3 === 0 ? c3 : i % 2 ? c1 : c2,
              height: `${18 + ((i * 37) % 58)}%`,
              animationDelay: `${(i % 9) * 0.24}s`,
            }} />
          ))}
        </div>
      )}

      {variant === 'flow' && (
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 200">
          {[0, 1, 2].map((i) => (
            <path key={i}
              d={`M -20 ${70 + i * 34} C 90 ${34 + i * 30}, 240 ${112 + i * 26}, 420 ${58 + i * 32}`}
              fill="none" stroke={i === 0 ? c1 : i === 1 ? c2 : c3}
              strokeWidth="1.2" strokeDasharray="7 11"
              className="swift-flow" style={{ animationDelay: `${i * 1.1}s` }} />
          ))}
        </svg>
      )}

      {variant === 'rays' && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="swift-rays" style={{ ['--r' as any]: c1 }} />
        </div>
      )}

      {variant === 'noise' && (
        <>
          <span className="swift-blob swift-blob-a" style={{ background: c1 }} />
          <div className="swift-noise absolute inset-0" />
        </>
      )}

      {/* optional WebP layer — drops in later with no code change */}
      {src && (
        <div
          className="absolute inset-0 motion-reduce:hidden"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            maskImage: 'radial-gradient(ellipse at 60% 40%, black 35%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 60% 40%, black 35%, transparent 72%)',
          }}
        />
      )}
    </div>
  );
}

export default AmbientMotion;
