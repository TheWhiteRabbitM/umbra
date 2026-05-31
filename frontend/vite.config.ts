import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Shared env vars live in the monorepo root .env.
export default defineConfig({
  plugins: [react()],
  envDir: "..",
  // Relative base so the built SPA works under a GitHub Pages project subpath.
  base: "./",
  server: {
    port: 5173,
  },
});
