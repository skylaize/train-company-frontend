/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0b0f19",
          900: "#111827",
          800: "#1f2937",
          700: "#374151",
        },
        line: "#1e293b",
        amber: {
          DEFAULT: "#f59e0b",
          dim: "#b45309",
        },
        cobalt: {
          DEFAULT: "#38bdf8",
          dim: "#0284c7",
        },
        offwhite: "#f8fafc",
        slate2: "#94a3b8",
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
