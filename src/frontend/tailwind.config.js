/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Single typeface across the whole app — Inter for a clean, professional look.
        // Both tokens resolve to Inter so existing `font-jakarta` / `font-display` usages
        // stay valid while rendering one consistent font.
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        jakarta: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadein: { from: { opacity: "0" }, to: { opacity: "1" } },
        // Cards rise + fade into the grid (staggered via inline animation-delay).
        cardin: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Brief pop when a figure/selection changes — draws the eye to the update.
        pop: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        // Chat panel drops in from above when reopened.
        dropin: {
          from: { opacity: "0", transform: "translateY(-16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Floating reopen button rises into view.
        slideup: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Auth slideshow progress bar fills over one slide's duration.
        slideProgress: { from: { width: "0%" }, to: { width: "100%" } },
        // Slow shared "breathing" zoom for the hero backdrop — applied to the whole crossfading stack so
        // overlapping slides are always at the same scale (a clean crossfade, no per-image ghosting).
        heroZoom: { "0%, 100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.06)" } },
      },
      animation: {
        fadein: "fadein 0.6s ease",
        cardin: "cardin 0.45s ease both",
        pop: "pop 0.4s ease",
        shimmer: "shimmer 1.4s infinite",
        dropin: "dropin 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        slideup: "slideup 0.3s ease",
        slideProgress: "slideProgress 5s linear forwards",
        heroZoom: "heroZoom 40s ease-in-out infinite",
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
