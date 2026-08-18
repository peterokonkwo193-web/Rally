import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Kahoot-style four answer shapes: colour + shape together, never colour alone.
        answer: {
          red: '#E5253A',
          blue: '#1368CE',
          yellow: '#D89E00',
          green: '#26890C',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
