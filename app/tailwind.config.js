/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        // === Use CSS Variables for opacity support ===
        void: 'rgb(var(--void) / <alpha-value>)',
        obsidian: 'rgb(var(--obsidian) / <alpha-value>)',
        charcoal: 'rgb(var(--charcoal) / <alpha-value>)',
        slate: 'rgb(var(--slate) / <alpha-value>)',
        cream: 'rgb(var(--cream) / <alpha-value>)',

        gold: 'rgb(var(--gold) / <alpha-value>)',
        'gold-light': 'rgb(var(--gold-light) / <alpha-value>)',

        profit: 'rgb(var(--profit) / <alpha-value>)',
        loss: 'rgb(var(--loss) / <alpha-value>)',
        electric: 'rgb(var(--electric) / <alpha-value>)',
        cyan: 'rgb(var(--cyan) / <alpha-value>)',

        // Fallback colors (in case variables aren't loaded)
        'gold-fallback': '#D4AF37',
        'profit-fallback': '#00D9A5',
        'loss-fallback': '#FF4757',
      },

      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        satoshi: ['Satoshi', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        fraunces: ['Fraunces', 'Georgia', 'serif'],
      },

      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.8s ease-out forwards',
        'slide-down': 'slideDown 0.6s ease-out forwards',
        'scale-in': 'scaleIn 0.6s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'ticker': 'ticker 30s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'line-grow': 'lineGrow 1.5s ease-out forwards',
      },

      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(40px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(212, 175, 55, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        glow: {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
        lineGrow: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },

      boxShadow: {
        'glow-gold': '0 0 60px rgba(212, 175, 55, 0.3)',
        'glow-profit': '0 0 40px rgba(0, 217, 165, 0.3)',
        'glow-electric': '0 0 40px rgba(99, 102, 241, 0.3)',
        'inner-glow': 'inset 0 0 60px rgba(212, 175, 55, 0.1)',
      },
    },
  },
  plugins: [],
};