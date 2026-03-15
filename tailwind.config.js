/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}", "./src/**/*.html", "./src/**/*.ts"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f7ff",
          100: "#e1effe",
          200: "#c7e0fd",
          300: "#a4cbfc",
          400: "#76aff8",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        secondary: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
        accent: {
          50: "#fdf8f3",
          100: "#fceee5",
          200: "#f8d4bf",
          300: "#f4b89a",
          400: "#ec8a5c",
          500: "#e85d2e",
          600: "#d74c21",
          700: "#b8341a",
          800: "#8b2815",
          900: "#5d1a0f",
        },
      },
      fontSize: {
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      fontFamily: {
        sans: [
          "Inter",
          '"Noto Sans JP"',
          '"Noto Sans CJK JP"',
          '"Hiragino Sans"',
          '"Yu Gothic"',
          "Meiryo",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
