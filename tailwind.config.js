/** @type {import('tailwindcss').Config} */

/* Les couleurs pointent vers des variables CSS définies dans index.css.
   Le placeholder <alpha-value> est ce qui préserve les modificateurs
   d'opacité de Tailwind : bg-cobalt/10, border-amber/40, etc.
   Changer de thème ne touche donc à aucune classe des composants. */
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: c("navy-950"),
          900: c("navy-900"),
          800: c("navy-800"),
          700: c("navy-700"),
        },
        line: c("line"),
        amber: {
          DEFAULT: c("amber"),
          dim: c("amber-dim"),
        },
        cobalt: {
          DEFAULT: c("cobalt"),
          dim: c("cobalt-dim"),
        },
        offwhite: c("offwhite"),
        onaccent: c("onaccent"),
        slate2: c("slate2"),
        rail: {
          red: c("rail-red"),
          green: c("rail-green"),
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono2: ["var(--font-mono2)", "monospace"],
      },
    },
  },
  plugins: [],
};
