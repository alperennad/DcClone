import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        discord: {
          bg: "#101114",
          panel: "#181a20",
          raised: "#22252d",
          line: "#2d3038",
          text: "#f4f6fb",
          muted: "#a8afbd",
          green: "#23a559",
          red: "#f23f42",
          blurple: "#5865f2"
        }
      }
    }
  },
  plugins: []
};

export default config;
