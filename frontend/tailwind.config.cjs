/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#111827',
          card: '#1f2937',
          panel: '#374151',
        },
        geo: {
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          900: '#134e4a',
        },
        // Aliases so existing class names keep working
        void: {
          DEFAULT: '#111827',
          deep: '#0f172a',
          raised: '#1f2937',
          panel: '#374151',
        },
        parchment: {
          DEFAULT: '#f3f4f6',
          muted: '#9ca3af',
          dim: '#6b7280',
        },
        sar: {
          DEFAULT: '#14b8a6',
          bright: '#2dd4bf',
          dim: '#0f766e',
        },
        ion: {
          DEFAULT: '#22d3ee',
          dim: '#0891b2',
        },
        flare: {
          DEFAULT: '#f87171',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
