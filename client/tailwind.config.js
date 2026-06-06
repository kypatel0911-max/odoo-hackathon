/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          950: "#070b12",
          900: "#0b1220",
          800: "#111827",
          700: "#1e293b",
          600: "#334155",
        },
        brand: {
          DEFAULT: "#0ea5e9",
          dim: "#0284c7",
          light: "#38bdf8",
        },
        accent: {
          DEFAULT: "#6366f1",
          dim: "#4f46e5",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
