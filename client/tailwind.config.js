/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c'
        },
        vn: {
          lacquer: '#C0392B',
          'lacquer-soft': '#E8A79F',
          saffron: '#F1A33C',
          'saffron-soft': '#F8D9A8',
          jade: '#2E8B72',
          'jade-soft': '#B5DCCE',
          lotus: '#F5A9BC',
          'lotus-soft': '#FBE3EA'
        }
      },
      fontFamily: {
        sans: [
          '"Be Vietnam Pro"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif'
        ],
        display: ['"Be Vietnam Pro"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 16px 40px -24px rgba(15, 23, 42, 0.24)',
        card: '0 8px 24px -18px rgba(15, 23, 42, 0.2)',
        lift: '0 1px 2px rgb(15 23 42 / 0.06), 0 8px 24px -8px rgb(15 23 42 / 0.12)',
        glow: '0 1px 2px rgba(15, 23, 42, 0.08)'
      },
      borderRadius: {
        '4xl': '2rem'
      },
      transitionTimingFunction: {
        'out-strong': 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out-strong': 'cubic-bezier(0.77, 0, 0.175, 1)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' }
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        },
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-5px)', opacity: '1' }
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.55s cubic-bezier(0.23, 1, 0.32, 1) both',
        float: 'float 7s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite',
        'bounce-dot': 'bounce-dot 1.2s infinite',
        marquee: 'marquee 45s linear infinite'
      }
    }
  },
  plugins: []
};
