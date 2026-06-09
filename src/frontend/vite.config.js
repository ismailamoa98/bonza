import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config — React plugin, dev server on :3000 (matches FRONTEND_URL),
// and a /api proxy to the Express backend (BACKEND_URL) for local development.
export default defineConfig({
  plugins: [react()],
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
