# SwiftTrade — drop 7: dark + light, cooler, better fonts

## What changed
- `styles/theme.css` — ONE theme, both modes. Light on `:root`, dark on `html.dark`.
  Cooler + screenshottable: aurora-glow backgrounds, glassy cards in dark, soft-shadow
  cards in light, gradient-text, accent glow. Modern fonts baked in:
  **Space Grotesk** (headings) · **Inter** (UI) · **JetBrains Mono** (numbers).
  Overriding the tokens recolors the token-based shell + dashboard in BOTH modes.
- `app/dashboard/invest/asset/[symbol]/page.tsx` — refactored from hardcoded hex to theme
  tokens, so the stock screen now flips with dark/light (it was locked light before).
- `components/ThemeToggle.tsx` — the toggle (persists to localStorage, respects system).

## Apply (3 steps)
1. **Import the theme** — in `app/layout.tsx`, after globals:
   ```ts
   import './globals.css';
   import '../styles/theme.css';
   ```
   Remove the earlier `robinhood-theme.css` / `swift-theme.css` imports — this replaces them.

2. **No-flash script** — add to `<head>` in `app/layout.tsx` so the right theme paints
   before first render (prevents a white flash in dark mode):
   ```tsx
   <script dangerouslySetInnerHTML={{ __html: `
     (function(){try{var t=localStorage.getItem('theme');
     var d=t?t==='dark':matchMedia('(prefers-color-scheme:dark)').matches;
     document.documentElement.classList.toggle('dark',d);}catch(e){}})();
   `}} />
   ```

3. **Drop the toggle in** — put `<ThemeToggle />` in your dashboard top bar / header
   (e.g. in `app/dashboard/layout.tsx`).

## Fonts note
The theme pulls fonts via Google Fonts `@import` — zero setup, works immediately. For the
fastest load with no layout shift, the "proper" Next.js way is `next/font/google` in
`app/layout.tsx`:
```ts
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
const inter = Inter({ subsets:['latin'], variable:'--font-body' });
const grotesk = Space_Grotesk({ subsets:['latin'], variable:'--font-display' });
const mono = JetBrains_Mono({ subsets:['latin'], variable:'--font-mono' });
// add `${inter.variable} ${grotesk.variable} ${mono.variable}` to <html className=…>
```
If you do that, delete the `@import` line at the top of theme.css (the `var(--font-*)`
references stay the same). Either approach works — `@import` is fine to ship now.

## Make it pop (optional, high-impact for screenshots)
- Wrap panels in `class="card"` instead of ad-hoc `bg-… border-…`.
- Headline numbers: add `class="num"` (tabular) and, for the hero total, `class="gradient-text"`.
- Primary CTAs: `class="pill-btn"`. Category chips: `tag-stock` / `tag-etf` / `tag-crypto`.
- Any accent element you want to glow: add `class="glow"`.

## Verify
- Toggle dark/light in the top bar — the whole dashboard + the stock page both flip,
  no white flash on reload.
- Headings render in Space Grotesk, numbers in JetBrains Mono, body in Inter.
- Nothing needs a zoom-out (viewport-fit guards are in the theme).

> Screens that still DON'T flip are ones hardcoding hex (like the stock page used to).
> Point me at them and I'll token-refactor them the same way.
