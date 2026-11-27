import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Vite config — React plugin, dev server on :3000 (matches FRONTEND_URL),
// and a /api proxy to the Express backend for local development.
// envDir points at the repo root so the single root .env serves both backend
// and frontend; only VITE_-prefixed vars (e.g. VITE_CLERK_PUBLISHABLE_KEY) are
// exposed to the client bundle — the Clerk secret stays server-side.
export default defineConfig({
  plugins: [react()],
  envDir: "../../",
  // §27b — the one money/points formatter lives in src/shared (CJS, shared with the backend). Alias it and
  // let the dev server read it (it sits above the frontend root).
  resolve: { alias: { "@shared": fileURLToPath(new URL("../shared", import.meta.url)) } },
  // maplibre-gl loads a web worker; Vite's dep pre-bundling breaks its worker URL (404 →
  // "Worker failed to load", blank basemap). Excluding it lets the worker resolve correctly.
  optimizeDeps: { exclude: ["maplibre-gl"] },
  // §27b — src/shared/format.js is authored CJS (so the backend can require it). esbuild (dev/test) interops
  // the default export automatically; the Rollup production build needs it added to the commonjs transform.
  build: { commonjsOptions: { include: [/src[\\/]shared/, /node_modules/] } },
  server: {
    port: 3000,
    fs: { allow: ["../.."] }, // allow importing src/shared (above the frontend root)
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
