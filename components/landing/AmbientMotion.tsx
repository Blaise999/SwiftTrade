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
  variant?: 'mesh' | 'grid' | 'orbit' | 'scan';
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
