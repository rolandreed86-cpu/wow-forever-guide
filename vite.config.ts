import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { viteSingleFile } from "vite-plugin-singlefile";

// `vite build --mode standalone` inlines all JS and CSS into one index.html (used for the hosted page);
// data files in public/data are fetched by relative URL either way.
export default defineConfig(({ mode }) => ({
  base: "./",
  server: { host: "::", port: 8080 },
  plugins: mode === "standalone" ? [react(), viteSingleFile()] : [react()],
  build: mode === "standalone" ? { outDir: "dist-standalone", copyPublicDir: true } : {},
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
}));
