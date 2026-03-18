import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef3ff',
          100: '#d9e4ff',
          400: '#4d7dff',
          500: '#355dff',
          600: '#2748d8',
        },
        accent: {
          100: '#e6fbf6',
          400: '#21c7a8',
          500: '#16ac90',
        },
        campus: {
          50: '#f7faff',
          100: '#eef3fb',
          200: '#dbe6f7',
          500: '#5f6f8b',
          700: '#24324a',
          900: '#1a2233',
        },
      },
      fontFamily: {
        sans: ['"Pretendard"', '"Sora"', ...defaultTheme.fontFamily.sans],
        display: ['"SUIT"', '"Syne"', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        card: '0 20px 40px rgba(53, 93, 255, 0.08)',
      },
      borderRadius: {
        '2xl': '1.25rem',
      },
      backgroundImage: {
        'campus-grid':
          'radial-gradient(circle at 10% 10%, rgba(77,125,255,0.15), transparent 35%), radial-gradient(circle at 90% 0%, rgba(33,199,168,0.12), transparent 40%)',
      },
    },
  },
  plugins: [],
}
