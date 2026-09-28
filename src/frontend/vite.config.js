import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config — React plugin, dev server on :3000 (matches FRONTEND_URL),
// and a /api proxy to the Express backend for local development.
// envDir points at the repo root so the single root .env serves both backend
// and frontend; only VITE_-prefixed vars (e.g. VITE_CLERK_PUBLISHABLE_KEY) are
// exposed to the client bundle — the Clerk secret stays server-side.
export default defineConfig({
  plugins: [react()],
  envDir: "../../",
  // maplibre-gl loads a web worker; Vite's dep pre-bundling breaks its worker URL (404 →
  // "Worker failed to load", blank basemap). Excluding it lets the worker resolve correctly.
  optimizeDeps: { exclude: ["maplibre-gl"] },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
