/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bonza: {
          DEFAULT: "#1F4F52",
          light: "#2A5F63",
          dark: "#173B3E",
          50: "#F5F9F9",
          100: "#E3EFEF",
        },
      },
    },
  },
  plugins: [],
};
