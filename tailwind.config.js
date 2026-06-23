/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          500: '#1F3864',  // Navy — primary brand
          600: '#1a2f56',
          700: '#162847',
        },
        accent: {
          400: '#2DD4BF',
          500: '#1F6B75',  // Teal — accent
          600: '#1a5a63',
        },
        danger:  '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        surface: '#F8FAFC',
        card:    '#FFFFFF',
      },
      height: {
        'screen-d': '100dvh',
      },
      minHeight: {
        'screen-d': '100dvh',
      }
    },
  },
  plugins: [],
}
