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
          primary: '#14532D',      // Deep Forest Green
          primaryHover: '#0F3F22',
          primaryLight: '#166534',
          secondary: '#22C55E',    // Fresh Green
          secondaryLight: '#86EFAC',
          accent: '#F97316',       // Warm Saffron
          accentHover: '#EA580C',
          accentLight: '#FFEDD5',
          warm: '#FAFAF7',         // Warm Off White
          surface: '#FFFFFF',      // White Surface
          mint: '#F0FDF4',         // Soft Mint Surface
          charcoal: '#172018',     // Dark Charcoal Primary Text
          muted: '#647067',        // Muted Gray Green Secondary Text
          border: '#E5E7E2',       // Clean Border
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#DC2626',
          info: '#2563EB',
        },
        // Backwards compatibility aliases
        kirana: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(20, 83, 45, 0.05), 0 1px 2px -1px rgba(20, 83, 45, 0.05)',
        'card': '0 4px 6px -1px rgba(20, 83, 45, 0.04), 0 2px 4px -2px rgba(20, 83, 45, 0.04)',
        'elevated': '0 10px 15px -3px rgba(20, 83, 45, 0.08), 0 4px 6px -4px rgba(20, 83, 45, 0.04)',
      },
      borderRadius: {
        'card': '14px',
      }
    },
  },
  plugins: [],
}
