/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Swift Trade · Premium midnight + sapphire ──────
        // Backgrounds: deep midnight w/ subtle warmth (not pure black)
        void:       '#070612',   // deepest
        obsidian:   '#0a0918',
        charcoal:   '#11102a',
        slate:      '#1a1838',
        // Off-white "cream" — pearl, not cold blue
        cream:      '#f4f1ea',
        // Brand accent — sapphire/indigo, refined not bright
        gold:       '#5b6dff',   // primary brand (legacy key)
        'gold-light':'#8b97ff',
        // Sapphire scale (the real star)
        sapphire: {
          50:'#eff1ff',100:'#dde2ff',200:'#bdc6ff',300:'#94a1ff',
          400:'#6e7eff',500:'#5b6dff',600:'#3f4ee6',700:'#2e3bb8',
          800:'#1f2780',900:'#11163f',950:'#0a0d2e',
        },
        // Champagne — warm accent for editorial highlights
        champagne: {
          50:'#fdfbf3',100:'#faf3da',200:'#f3e6b1',300:'#ead68a',
          400:'#dfc068',500:'#d4af37',600:'#b88f25',700:'#8f6c1d',
        },
        // Trading PnL — refined, not neon
        profit:        '#3aa978',
        'profit-dark': '#2c8a61',
        loss:          '#d8493e',
        'loss-dark':   '#b83a31',
        // Electric / cyan accents (kept for legacy refs but darker)
        electric:        '#5b6dff',
        'electric-light':'#8b97ff',
        cyan:            '#67d4e0',
        // ink scale (kept, mapped to new dark family)
        ink: { 950:'#070612', 900:'#0a0918', 800:'#11102a', 700:'#1a1838', 600:'#252154' },
        // Pearl scale for text hierarchy
        pearl: { 50:'#fdfcf8', 100:'#f4f1ea', 200:'#dcd6c8', 300:'#a8a293', 400:'#6e6a5e' },
      },
      fontFamily: {
        // Modern, app-like sans for the console (Robinhood-ish, not corporate)
        app:     ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        // Editorial-grade serif for headlines (premium fintech move)
        serif:   ['"Fraunces"', 'Georgia', 'serif'],
        // Geometric sans for display (Sora is fine)
        display: ['"Sora"', 'system-ui', 'sans-serif'],
        // Body
        body:    ['"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in':    'fadeIn 0.8s ease-out forwards',
        'slide-up':   'slideUp 0.8s ease-out forwards',
        'slide-down': 'slideDown 0.6s ease-out forwards',
        'scale-in':   'scaleIn 0.6s ease-out forwards',
        'shimmer':    'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        'float':      'float 6s ease-in-out infinite',
        'ticker':     'ticker 60s linear infinite',
        'glow':       'glow 2s ease-in-out infinite alternate',
        'aurora':     'aurora 18s ease infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(40px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { '0%': { opacity: '0', transform: 'scale(0.95)' },      '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseGlow: { '0%, 100%': { boxShadow: '0 0 20px rgba(91,109,255,0.30)' }, '50%': { boxShadow: '0 0 44px rgba(91,109,255,0.55)' } },
        float:     { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-18px)' } },
        ticker:    { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        glow:      { '0%': { opacity: '0.5' }, '100%': { opacity: '1' } },
        aurora:    {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern':    'linear-gradient(to right, rgba(140,151,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(140,151,255,0.04) 1px, transparent 1px)',
        'grid-blue':       'linear-gradient(to right, rgba(140,151,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(140,151,255,0.04) 1px, transparent 1px)',
        'radial-blue':     'radial-gradient(60% 60% at 50% 0%, rgba(91,109,255,0.18) 0%, rgba(0,0,0,0) 60%)',
        'glass':           'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
        'aurora':          'linear-gradient(120deg, rgba(91,109,255,0.18), rgba(212,175,55,0.12), rgba(103,212,224,0.10), rgba(91,109,255,0.18))',
        'noise':           "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        'glow-gold':     '0 0 40px rgba(91,109,255,0.30)',
        'glow-blue':     '0 0 40px rgba(91,109,255,0.30)',
        'glow-soft':     '0 8px 30px rgba(40,50,150,0.25)',
        'glow-profit':   '0 0 40px rgba(58,169,120,0.30)',
        'glow-electric': '0 0 32px rgba(91,109,255,0.35)',
        'glow-champagne':'0 0 30px rgba(212,175,55,0.20)',
        'inner-glow':    'inset 0 0 60px rgba(91,109,255,0.08)',
        'card':          '0 1px 0 rgba(255,255,255,0.04) inset, 0 30px 60px -15px rgba(0,0,0,0.50)',
      },
      letterSpacing: {
        'tightest': '-0.04em',
      },
    },
  },
  plugins: [],
};
