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
          light: '#f3f4f6',
          DEFAULT: '#9ca3af',
          dark: '#4b5563',
        }
      },
      zIndex: {
        header: '10',
        overlay: '50',
        modal: '100',
        toast: '150',
      }
    },
  },
  plugins: [],
}
