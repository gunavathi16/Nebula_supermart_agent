/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nebula: {
          cream: '#FFFBEB',         // Warm Amber Cream
          lightCream: '#F8FAFC',    // Modern Crisp Executive Background
          yellow: '#F59E0B',        // Professional Brand Amber/Gold
          softYellow: '#FEF3C7',    // Soft Amber Highlight
          charcoal: '#0F172A',      // Slate-900 Primary High-Contrast Text
          green: '#15803D',         // Rich Forest Green
          orange: '#EA580C',        // Saffron Orange Primary CTA
          white: '#FFFFFF',         // Crisp White
          border: '#E2E8F0',        // Modern Clean Slate Border
          muted: '#64748B',         // Professional Muted Slate Text
          sidebar: '#FFFFFF',       // Clean White Sidebar
          // Legacy mappings mapped to new professional system
          primary: '#15803D',
          primaryHover: '#166534',
          primaryLight: '#16A34A',
          secondary: '#F59E0B',
          secondaryLight: '#FEF3C7',
          accent: '#EA580C',
          accentHover: '#C2410C',
          accentLight: '#FFFBEB',
          warm: '#F8FAFC',
          surface: '#FFFFFF',
          mint: '#F0FDF4',
          danger: '#DC2626',
          info: '#2563EB',
        },
        kirana: {
          50: '#F8FAFC',
          100: '#FFFBEB',
          200: '#FEF3C7',
          500: '#F59E0B',
          600: '#EA580C',
          700: '#15803D',
          800: '#166534',
          900: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'card': '0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        'elevated': '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)',
      },
      borderRadius: {
        'card': '14px',
      }
    },
  },
  plugins: [],
}
