import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: process.env.HOMEBOX_URL || "http://localhost:7745",
        changeOrigin: true,
      },
    },
  },
});
