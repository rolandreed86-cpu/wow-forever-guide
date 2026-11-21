import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        stone: { DEFAULT: "#120E0A", deep: "#0D0A07" },
        iron: "#1C1610",
        gold: { DEFAULT: "#C9A24A", bright: "#F0CF7A", pale: "#E8C46A", dim: "#6E5020" },
        parchment: { DEFAULT: "#EAD9B0", ink: "#2B1E10" },
        crimson: "#5A1A12",
        bone: "#E8DCC0",
        muted: "#A8936A",
        q: {
          poor: "#9D9D9D", common: "#F4F1EA", uncommon: "#2BDC2B",
          rare: "#4AA3FF", epic: "#C27FFF", legendary: "#FF8A1A",
        },
      },
      fontFamily: {
        display: ["Cinzel", "Georgia", "serif"],
        body: ["Alegreya", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
