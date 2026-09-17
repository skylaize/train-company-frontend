/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Fond principal et cartes : charbon chaud profond (pas de bleu-noir froid)
        navy: {
          950: "#18140f",
          900: "#221c15",
          800: "#2d2519",
          700: "#4a3f2e",
        },
        // Séparateurs, feutrés et chauds
        line: "#4a3f2e",
        // Ochre/laiton discret pour la trésorerie et les accents chauds
        amber: {
          DEFAULT: "#c99a3e",
          dim: "#7a5f28",
        },
        // Bleu acier feutré pour les accents interactifs (pas de cyan vif)
        cobalt: {
          DEFAULT: "#4f7fa3",
          dim: "#324f66",
        },
        // Blanc cassé chaud pour la lisibilité du texte
        offwhite: "#ece4d3",
        slate2: "#a3947a",
        // Statuts, désaturés pour rester dans la palette chaude
        rail: {
          red: "#a8483a",
          green: "#5c8a68",
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
