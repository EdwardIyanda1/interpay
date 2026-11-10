/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Sora"', "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        ink: "#0B1B3F",
        navy: "#061026",
        brand: {
          50: "#EEF3FF",
          100: "#D9E2F7",
          600: "#1F4FD8",
          700: "#173DB0",
        },
        emerald: {
          400: "#34D399",
          600: "#16794C",
        },
        danger: "#B42318",
      },
    },
  },
  plugins: [],
};