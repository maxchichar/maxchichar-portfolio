/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Share Tech Mono"', 'monospace'],
        display: ['"Orbitron"', 'sans-serif'],
        body: ['"Rajdhani"', 'sans-serif'],
      },
      colors: {
        void: '#000005',
        deep: '#03000f',
        core: '#0a0020',
        purple: {
          DEFAULT: '#7b00ff',
          dim: '#3d0080',
          bright: '#bf00ff',
        },
        cyan: { DEFAULT: '#00ffff', dim: '#007777' },
        plasma: '#da70d6',
        ghost: 'rgba(240,230,255,0.85)',
      },
      animation: {
        'flicker': 'flicker 6s infinite',
        'scan': 'scan 8s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'orbit': 'orbit 12s linear infinite',
        'data-flow': 'dataFlow 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
      },
      keyframes: {
        flicker: {
          '0%,94%,96%,98%,100%': { opacity: '1' },
          '95%,97%': { opacity: '0.6' },
        },
        scan: { from: { backgroundPosition: '0 0' }, to: { backgroundPosition: '0 200px' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 20px #7b00ff' }, '50%': { boxShadow: '0 0 60px #bf00ff, 0 0 100px #7b00ff55' } },
        orbit: { from: { transform: 'rotate(0deg) translateX(80px) rotate(0deg)' }, to: { transform: 'rotate(360deg) translateX(80px) rotate(-360deg)' } },
        dataFlow: { from: { backgroundPosition: '0 0' }, to: { backgroundPosition: '100px 0' } },
        float: { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-16px)' } },
      },
      backdropBlur: { xs: '2px' },
      boxShadow: {
        glow: '0 0 20px #7b00ff, 0 0 40px #7b00ff44',
        'glow-cyan': '0 0 20px #00ffff, 0 0 40px #00ffff44',
        'glow-lg': '0 0 40px #7b00ff, 0 0 80px #7b00ff44, 0 0 120px #7b00ff22',
      },
    },
  },
  plugins: [],
};
