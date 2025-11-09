const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#05060A',
        'bg-surface': 'rgba(12,16,24,0.72)',
        accent: {
          primary: '#2CFF7A',
          secondary: '#7A5CFF',
        },
        text: {
          high: '#FFFFFF',
          mid: '#B7C0D1',
          low: '#6E778A',
        },
        status: {
          success: '#2CFF7A',
          warning: '#FFB020',
          danger: '#FF5C5C',
        },
      },
      fontFamily: {
        display: ['SF Pro Display', ...fontFamily.sans],
        title: ['SF Pro Text', ...fontFamily.sans],
        body: ['SF Pro Text', ...fontFamily.sans],
      },
      borderRadius: {
        card: '24px',
        button: '20px',
        chip: '16px',
      },
      boxShadow: {
        glow: '0 0 24px rgba(44, 255, 122, 0.45)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.96)' },
        },
        ripple: {
          '0%': { transform: 'scale(1)', opacity: 0.45 },
          '80%': { transform: 'scale(1.6)', opacity: 0 },
          '100%': { opacity: 0 },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        ripple: 'ripple 2.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
