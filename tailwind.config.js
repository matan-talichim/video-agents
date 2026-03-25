/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0a12',
          card: '#111827',
          border: '#1a1a2e',
          'border-light': '#374151',
        },
        accent: {
          purple: '#7c3aed',
          'purple-light': '#8b5cf6',
        },
      },
    },
  },
  plugins: [],
};
