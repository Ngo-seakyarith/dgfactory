import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#07111f",
        foreground: "#f8fafc",
        muted: {
          foreground: "#9fb0c5",
        },
      },
      boxShadow: {
        executive: "0 24px 80px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
