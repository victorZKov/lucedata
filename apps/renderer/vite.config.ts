import path from "path";

import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Plugin to handle missing Vite client env module in Electron
const electronEnvPlugin = (): Plugin => ({
  name: "electron-env-fix",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.includes("env.mjs")) {
        res.setHeader("Content-Type", "application/javascript");
        res.end("export default {}");
        return;
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), electronEnvPlugin()],
  base: mode === "production" ? "./" : "/",
  mode: mode || "development",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    fs: {
      allow: ["..", "../..", "../../node_modules"],
      strict: false,
    },
    cors: true,
    hmr: {
      overlay: false,
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  optimizeDeps: {
    exclude: ["electron"],
    esbuildOptions: {
      target: "esnext",
    },
  },
  envPrefix: ["VITE_", "RENDERER_"],
  clearScreen: false,
}));
