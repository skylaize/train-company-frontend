/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Fond principal et cartes (remplace le marron par un bleu nuit/charbon très profond)
        navy: {
          950: "#0b0f19",
          900: "#111827",
          800: "#1f2937",
          700: "#374151",
        },
        // Séparateurs neutres
        line: "#1e293b",
        // Ambre/Orange vif et néon (au lieu du jaune délavé)
        amber: {
          DEFAULT: "#f59e0b",
          dim: "#b45309",
        },
        // Bleu/Cyan pour les accents secondaires
        cobalt: {
          DEFAULT: "#38bdf8",
          dim: "#0284c7",
        },
        // Blanc très pur pour la lisibilité du texte (au lieu du beige)
        offwhite: "#f8fafc",
        slate2: "#94a3b8",
        // Statuts
        rail: {
          red: "#ef4444",
          green: "#10b981",
        },
      },
      fontFamily: {
        display: ["Bitter", "serif"],
        body: ["'Work Sans'", "sans-serif"],
        mono2: ["'Space Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};