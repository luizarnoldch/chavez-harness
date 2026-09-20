// @ts-check
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const apiInternal =
  process.env.API_INTERNAL_URL ?? "http://localhost:28001";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react()],
  server: {
    port: 4321,
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: apiInternal,
          changeOrigin: true,
          secure: false,
        },
        "/ws": {
          target: apiInternal,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  },
  adapter: node({
    mode: "standalone",
  }),
});
