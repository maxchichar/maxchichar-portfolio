/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#020202',
        purple: '#a855f7',
        'purple-dim': '#7c3aed',
        zinc: '#71717a',
        'zinc-light': '#d4d4d8',
        white: '#fafafa',
        ghost: '#ffffff08',
      },
      fontFamily: {
        display: ['Bebas Neue', 'Impact', 'display'],
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        serif: ['Playfair Display', 'serif'],
      },
      fontSize: {
        'display-2xl': ['7rem', { lineHeight: 'tight' }],
        'display-xl': ['5rem', { lineHeight: 'tight' }],
        'display-lg': ['3.5rem', { lineHeight: 'tight' }],
        'body-lg': ['1.125rem', { lineHeight: 'relaxed' }],
        'body-sm': ['0.875rem', { lineHeight: 'normal' }],
        'mono-sm': ['0.75rem', { lineHeight: 'normal' }],
      },
    },
  },
  plugins: [],
}
