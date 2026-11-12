import { defineConfig } from "vite";
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: process.env.HOMEBOX_URL || "http://localhost:7745",
        changeOrigin: true,
      },
    },
  },
});
