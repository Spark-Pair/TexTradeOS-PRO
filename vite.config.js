import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from '@tailwindcss/vite'
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  envPrefix: ["VITE_", "IS_"],
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      cleanupOutdatedCaches: true,
      includeAssets: ["favicon.ico", "android-chrome-192x192.png", "android-chrome-512x512.png"],
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: "TexTradeOS PRO",
        short_name: "TexTradeOS PRO",
        start_url: "/",
        display: "standalone",
        theme_color: "#127475",
        background_color: "#ffffff",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
    force: true,
  },
  build: {
    sourcemap: false,
  },

  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
    // ❌ REMOVE hmr config completely
  }
});
