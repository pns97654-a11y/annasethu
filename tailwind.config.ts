import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: '#f1f9ee',
          100: '#dcefd4',
          200: '#b8dfac',
          300: '#8ecb7d',
          400: '#66b357',
          500: '#479a3b',
          600: '#357c2c',
          700: '#2b6224',
          800: '#254e21',
          900: '#20421e'
        },
        amber: {
          500: '#f2a900'
        }
      },
      borderRadius: {
        xl2: '1.25rem'
      }
    }
  },
  plugins: []
};

export default config;
