import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

const isDev = process.env.NODE_ENV === "development";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mcpPlugin(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      devOptions: { enabled: false },
      disable: isDev,
      includeAssets: ["favicon.png", "favicon.ico", "icons/icon-192x192.png", "icons/icon-512x512.png", "icons/apple-touch-icon.png"],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/OneSignalSDKWorker\.js$/],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
        runtimeCaching: [
          {
            // HTML navigations: always try network first so a hard refresh
            // never gets stuck on an old shell (causa raíz del loop al refrescar PlusPy).
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-shell",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "property-photos",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      manifest: {
        name: "PlusPy · Gestión Inmobiliaria",
        short_name: "PlusPy",
        description: "Panel de gestión inmobiliaria Plusterra",
        theme_color: "#FF6B2C",
        background_color: "#1E3A5F",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        icons: [
          { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "sonner"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
