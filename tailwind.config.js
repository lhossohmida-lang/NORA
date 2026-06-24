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

        /* --- Luxury client palette (emerald + gold) --------------------- *
         * Used only by the customer-facing storefront. The admin panel
         * keeps the sage/blush tokens above, untouched.                    */
        forest:     '#0C3B2E', // deepest emerald — splash, nav, overlays
        emerald:    '#1A5B45', // primary brand green
        'emerald-deep': '#0F4435',
        pine:       '#15493A',
        gold:       '#C6A052', // primary gold — buttons, accents
        'gold-dark':'#A8843B',
        'gold-soft':'#E7CE94', // light gold — highlights, sheen
        ivory:      '#F7F2E9', // warm page background
        sand:       '#EFE6D6', // alternate surface
        bark:       '#21302A', // dark green-tinted text on ivory
      },
      fontFamily: {
        sans: ['Tajawal', 'Cairo', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Cormorant Garamond', 'serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(42, 36, 56, 0.08)',
        soft:  '0 4px 20px rgba(168, 197, 160, 0.18)',
        bloom: '0 10px 40px rgba(212, 165, 165, 0.25)',
        // Luxury client shadows
        lux:      '0 24px 60px -18px rgba(12, 59, 46, 0.40)',
        'lux-sm': '0 10px 30px -12px rgba(12, 59, 46, 0.30)',
        gold:     '0 12px 34px -10px rgba(168, 132, 59, 0.55)',
      },
      backgroundImage: {
        'sage-blush': 'linear-gradient(135deg, #A8C5A0 0%, #D4A5A5 100%)',
        'pearl-cream': 'linear-gradient(180deg, #FAF7F2 0%, #F8F3EE 100%)',
        // Luxury client gradients
        'emerald-deep-grad': 'linear-gradient(135deg, #1A5B45 0%, #0C3B2E 100%)',
        'gold-fill': 'linear-gradient(135deg, #E7CE94 0%, #C6A052 45%, #A8843B 100%)',
        'gold-sheen': 'linear-gradient(100deg, #A8843B 0%, #E7CE94 42%, #C6A052 60%, #E7CE94 100%)',
        'silk-emerald': 'radial-gradient(120% 120% at 20% 10%, #1A5B45 0%, #0F4435 45%, #0C3B2E 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2.5s linear infinite',
        // Luxury client animations
        'ken-burns': 'kenBurns 18s ease-in-out infinite alternate',
        'gold-sweep': 'goldSweep 3.5s ease-in-out infinite',
        'float-y': 'floatY 6s ease-in-out infinite',
        'shine': 'shine 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:   { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp:  { '0%': { transform: 'translateY(20px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        shimmer:  { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
        kenBurns: {
          '0%':   { transform: 'scale(1) translate3d(0,0,0)' },
          '100%': { transform: 'scale(1.12) translate3d(-1.5%, -1.5%, 0)' },
        },
        goldSweep: {
          '0%':   { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        floatY: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-7px)' },
        },
        shine: {
          '0%':   { transform: 'translateX(-120%) skewX(-18deg)', opacity: 0 },
          '40%':  { opacity: 0.55 },
          '100%': { transform: 'translateX(220%) skewX(-18deg)', opacity: 0 },
        },
      },
    },
  },
  plugins: [],
};
