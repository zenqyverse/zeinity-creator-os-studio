import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      borderColor: {
        DEFAULT: "var(--line)",
      },
      colors: {
        zbg: {
          DEFAULT: "var(--bg)",
          light: "#edf3fb",
        },
        zpanel: {
          DEFAULT: "var(--panel)",
          2: "var(--panel2)",
          light: "#ffffff",
          "light-2": "#e9f0fa",
        },
        zline: {
          DEFAULT: "var(--line)",
          light: "#b7c7db",
        },
        zink: {
          DEFAULT: "var(--ink)",
          light: "#17243c",
        },
        zmuted: {
          DEFAULT: "var(--muted)",
          light: "#4e6078",
        },
        zaccent: {
          DEFAULT: "var(--accent)",
          hover: "#9ba6ff",
        },
        zcyan: {
          DEFAULT: "var(--cyan)",
          hover: "#84e6f0",
        },
        zpink: {
          DEFAULT: "var(--pink)",
        },
        zwarn: {
          DEFAULT: "#ffd597",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-space-mono)", "monospace"],
      },
      aspectRatio: {
        "9/16": "9 / 16",
      },
    },
  },
  plugins: [],
};

export default config;
