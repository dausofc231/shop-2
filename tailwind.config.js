// tailwind.config.js
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./app/**/*.{js,jsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#3b82f6",
        "bg-dark": "#111827",
        "card-dark": "#1e293b",
        text: "#ffffff",
        "text-secondary": "#cbd5e1",
        "input-border": "#334155",
        "input-placeholder": "#94a3b8",
      },
    },
  },
  plugins: [],
};