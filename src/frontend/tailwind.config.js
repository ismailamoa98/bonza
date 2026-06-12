/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        // Serif display — used ONLY on the hero <h1>, the nav/footer wordmark, and
        // the final-CTA <h2> (visitsaudi-style serif-display + sans-body pairing).
        display: ['"Playfair Display"', "ui-serif", "Georgia", "serif"],
      },
      keyframes: {
        fadein: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        fadein: "fadein 0.6s ease",
      },
      colors: {
        // Brand: terra cotta. The whole app themes through this scale, so every
        // existing bg-bonza / text-bonza / bg-bonza-50 etc. inherits the new brand.
        bonza: {
          DEFAULT: "#da7756",
          light: "#e0906f",
          dark: "#c2603f",
          50: "#FBF2EE",
          100: "#F4E3DB",
        },
        // Pampas cream — one continuous page background.
        cream: "#F4F3EE",
        // Spec text colors.
        ink: {
          DEFAULT: "#2a2420",
          soft: "#6a6258",
          muted: "#9a9088",
        },
      },
    },
  },
  plugins: [],
};
