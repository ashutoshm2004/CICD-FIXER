/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {

      colors: {

        cyber: {

          black: "#050505",

          panel: "#0d0d0d",

          border: "rgba(255,255,255,0.08)",

          orange: "#ff6b2c",

          orangeSoft: "#ff9365",

          red: "#ff3b30",

          muted: "#7a7a7a",
        },
      },

      fontFamily: {

        display: ["var(--font-display)"],

        body: ["var(--font-body)"],

        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "monospace",
        ],
      },

      boxShadow: {

        glow: "0 0 80px rgba(255,107,44,0.18)",

        panel: "0 30px 80px rgba(0,0,0,0.45)",

        intense: "0 0 120px rgba(255,107,44,0.22)",
      },

      backgroundImage: {

        radial:
          "radial-gradient(circle at center, rgba(255,107,44,0.12), transparent 60%)",

        telemetry:
          "linear-gradient(90deg, rgba(255,107,44,0), rgba(255,107,44,0.4), rgba(255,107,44,0))",
      },

      animation: {

        float: "float 8s ease-in-out infinite",

        glow: "glow 3s ease-in-out infinite",

        pulseSlow: "pulseSlow 4s ease-in-out infinite",

        scan: "scan 6s linear infinite",

        slideUp: "slideUp 0.7s ease forwards",
      },

      keyframes: {

        float: {

          "0%": {
            transform: "translateY(0px)",
          },

          "50%": {
            transform: "translateY(-12px)",
          },

          "100%": {
            transform: "translateY(0px)",
          },
        },

        glow: {

          "0%": {
            opacity: 0.5,
          },

          "50%": {
            opacity: 1,
          },

          "100%": {
            opacity: 0.5,
          },
        },

        pulseSlow: {

          "0%": {
            transform: "scale(1)",
            opacity: 0.5,
          },

          "50%": {
            transform: "scale(1.04)",
            opacity: 1,
          },

          "100%": {
            transform: "scale(1)",
            opacity: 0.5,
          },
        },

        scan: {

          "0%": {
            transform: "translateY(-100%)",
          },

          "100%": {
            transform: "translateY(300%)",
          },
        },

        slideUp: {

          "0%": {
            opacity: 0,
            transform: "translateY(20px)",
          },

          "100%": {
            opacity: 1,
            transform: "translateY(0)",
          },
        },
      },

      maxWidth: {

        "8xl": "1600px",
      },
    },
  },

  plugins: [],
};