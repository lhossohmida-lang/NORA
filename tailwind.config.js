/**
 * Tailwind config — Afnan
 *
 * Palette swaps Walida's coral/peach for a softer sage/blush identity
 * that still feels luxurious and feminine. Anywhere the legacy app used
 * a coral→peach gradient, use `bg-gradient-to-r from-sage to-blush`.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sage:      '#A8C5A0', // primary — replaces coral
        blush:     '#D4A5A5', // secondary — replaces peach
        cream:     '#F8F3EE', // cards / panels
        pearl:     '#FAF7F2', // page background
        ink:       '#2A2438', // body text
        champagne: '#E8C5A0', // optional accent / badges
      },
      fontFamily: {
        sans: ['Tajawal', 'Cairo', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Cormorant Garamond', 'serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(42, 36, 56, 0.08)',
        soft:  '0 4px 20px rgba(168, 197, 160, 0.18)',
        bloom: '0 10px 40px rgba(212, 165, 165, 0.25)',
      },
      backgroundImage: {
        'sage-blush': 'linear-gradient(135deg, #A8C5A0 0%, #D4A5A5 100%)',
        'pearl-cream': 'linear-gradient(180deg, #FAF7F2 0%, #F8F3EE 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp:  { '0%': { transform: 'translateY(20px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        shimmer:  { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
      },
    },
  },
  plugins: [],
};
