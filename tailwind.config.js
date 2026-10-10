/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        botanical: {
          canvas: "#fcfbf9",
          focus: "#f4f8f5",
          trunk: "#1b4332",
          branch: "#2d6a4f",
          growing: "#40916c",
          leaf: "#52b788",
          bud: "#d97706",
          charcoal: "#1e293b",
          muted: "#64748b",
          surface: "rgba(255, 255, 255, 0.85)",
          border: "#e5e9e5"
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
