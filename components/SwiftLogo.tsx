'use client';

import React from 'react';

/**
 * SwiftLogo — the official Swift Trade brand mark.
 *
 * The mark: a stylised letter "S" sliced into two stacked ribbons that
 * also read as an upward chart line — three flat plateaus stepping up
 * from bottom-left to top-right. Wordmark uses a clean tracked sans
 * with a gold accent on the "·" separator dot.
 *
 * Use `mark` (icon only) for favicons and small spaces. Use `lockup`
 * (mark + wordmark) for navigation and headers.
 */
export function SwiftMark({
  size = 32,
  className = '',
  gradient = true,
}: {
  size?: number;
  className?: string;
  gradient?: boolean;
}) {
  const gradId = React.useId();
  const ribbon1 = gradient ? `url(#${gradId}-r1)` : '#22D3EE';
  const ribbon2 = gradient ? `url(#${gradId}-r2)` : '#5B7CFF';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Swift Trade"
      role="img"
    >
      <defs>
        <linearGradient id={`${gradId}-r1`} x1="6" y1="10" x2="34" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00E88F" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id={`${gradId}-r2`} x1="6" y1="22" x2="34" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#5B7CFF" />
        </linearGradient>
        <linearGradient id={`${gradId}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D1324" />
          <stop offset="100%" stopColor="#050713" />
        </linearGradient>
      </defs>

      {/* Rounded square background with subtle border */}
      <rect x="0.5" y="0.5" width="39" height="39" rx="10" fill={`url(#${gradId}-bg)`} stroke="rgba(255,255,255,0.08)" />

      {/* Upper ribbon — top half of the "S", reads as an up-step */}
      <path
        d="M9 14 L18 9 L24 13 L31 9.5"
        stroke={ribbon1}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Middle accent — the kerf that suggests the S waist */}
      <circle cx="20" cy="20" r="1.4" fill="#E7C66A" />
      {/* Lower ribbon — bottom half of the "S", a second up-step */}
      <path
        d="M9 30.5 L16 26.5 L22 30.5 L31 25"
        stroke={ribbon2}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function SwiftLogo({
  size = 32,
  className = '',
  wordmark = true,
  wordmarkColor = '#F8FAFC',
}: {
  size?: number;
  className?: string;
  wordmark?: boolean;
  wordmarkColor?: string;
}) {
  if (!wordmark) {
    return <SwiftMark size={size} className={className} />;
  }
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <SwiftMark size={size} />
      <div className="flex items-baseline gap-1.5 leading-none">
        <span
          className="font-semibold tracking-tight"
          style={{
            fontSize: size * 0.55,
            color: wordmarkColor,
            letterSpacing: '-0.01em',
          }}
        >
          Swift
        </span>
        <span
          style={{
            color: '#E7C66A',
            fontSize: size * 0.5,
            lineHeight: 1,
          }}
        >·</span>
        <span
          className="font-light tracking-tight"
          style={{
            fontSize: size * 0.55,
            color: wordmarkColor,
            letterSpacing: '-0.01em',
            opacity: 0.92,
          }}
        >
          Trade
        </span>
      </div>
    </div>
  );
}

export default SwiftLogo;
