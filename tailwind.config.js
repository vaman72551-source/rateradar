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
          DEFAULT: '#0A0F1E',
          card: '#131929',
        },
        accent: {
          gold: '#D4A853',
        },
        text: {
          primary: '#F5F5F0',
          muted: '#8892A4',
        },
        border: 'rgba(212, 168, 83, 0.2)',
      },
      fontFamily: {
        outfit: ['"Outfit"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
