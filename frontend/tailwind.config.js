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
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
          light: '#dbeafe',
        },
        rentally: {
          coral: '#e36a63',
          dark: '#c85b55',
          light: '#fef2f1',
        }
      }
    },
  },
  plugins: [],
}
