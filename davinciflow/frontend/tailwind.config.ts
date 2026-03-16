import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#6366F1',
          source: '#3B82F6',
          transform: '#8B5CF6',
          sink: '#10B981'
        }
      },
      boxShadow: {
        panel: '0 18px 60px rgba(15, 23, 42, 0.45)'
      },
      fontFamily: {
        sans: ['"Sora"', 'ui-sans-serif', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: [forms]
} satisfies Config;
