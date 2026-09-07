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
          cream: '#FFF4D6',         // Warm Cream
          lightCream: '#FFFAED',    // Light Cream
          yellow: '#FFD84D',        // Brand Yellow
          softYellow: '#FFF0B3',    // Soft Yellow
          charcoal: '#292929',      // Dark Charcoal Primary Text
          green: '#287A4B',         // Fresh Green
          orange: '#F28C28',        // Saffron Orange Primary CTA
          white: '#FFFFFF',         // Crisp White
          border: '#E8E0CC',        // Light Cream Border
          muted: '#6B6B63',         // Muted Text
          sidebar: '#FFFDF7',       // Warm White / Cream Sidebar
          // Legacy mappings mapped to new brand system
          primary: '#287A4B',
          primaryHover: '#1E603A',
          primaryLight: '#3A9662',
          secondary: '#FFD84D',
          secondaryLight: '#FFF0B3',
          accent: '#F28C28',
          accentHover: '#D9771A',
          accentLight: '#FFF4D6',
          warm: '#FFFAED',
          surface: '#FFFFFF',
          mint: '#F0FDF4',
          danger: '#DC2626',
          info: '#2563EB',
        },
        kirana: {
          50: '#FFFAED',
          100: '#FFF4D6',
          200: '#FFF0B3',
          500: '#FFD84D',
          600: '#F28C28',
          700: '#287A4B',
          800: '#1E603A',
          900: '#292929',
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
