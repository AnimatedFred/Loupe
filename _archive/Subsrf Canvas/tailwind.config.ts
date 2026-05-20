import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        neon:    '#00FF87',
        void:    '#050508',
        deep:    '#09090F',
        layer:   '#111118',
        surface: '#18181F',
        t1:      '#F2F2F4',
        ok:      '#39D98A',
        warn:    '#FFB020',
        err:     '#FF4D4D',
        blue:    '#4A9EFF',
      },
      fontFamily: {
        sans:    ['var(--font-manrope)', 'sans-serif'],
        mono:    ['var(--font-azeret-mono)', 'monospace'],
        display: ['var(--font-manrope)', 'sans-serif'],
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.2' },
        },
        'gen-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':       { opacity: '0.5', transform: 'scale(1.01)' },
        },
      },
      animation: {
        blink:     'blink 1.4s ease-in-out infinite',
        'gen-pulse': 'gen-pulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
