/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F4F0FF',
          100: '#EBE4FE',
          200: '#D8CAFD',
          300: '#BEA4FC',
          400: '#9E74F9',
          500: '#7E43F4',
          600: '#6925EB',
          700: '#5A1ACD',
          800: '#4B16AA',
          900: '#3F148B',
        },
        lavender: {
          light: '#F8F7FD',
          sidebar: '#F1ECFE',
          active: '#E7DFFC',
          pill: '#EDE7FE',
          iconBg: '#EDE7FC',
          border: '#E8E1F8'
        },
        surface: {
          bg: '#F8F9FE',
          card: '#FFFFFF',
          border: '#ECEBF5',
          hover: '#F9F8FD'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(110, 90, 180, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
        'card': '0 4px 20px -2px rgba(110, 90, 180, 0.06)',
        'elevated': '0 10px 30px -4px rgba(99, 66, 232, 0.1)',
      }
    },
  },
  plugins: [],
}
