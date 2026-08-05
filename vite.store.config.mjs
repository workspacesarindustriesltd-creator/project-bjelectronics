import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { storefrontBoundaryPlugin } from "./scripts/storefront-boundary-plugin.mjs";
import { storeUiNormalizationPlugin } from "./scripts/store-ui-normalization-plugin.mjs";

const resolve = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: resolve("./apps/store"),
  publicDir: resolve("./public"),
  build: {
    outDir: resolve("./dist/client"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: ["terminal.local"],
    proxy: { "/api": "http://localhost:4000" },
  },
  plugins: [storeUiNormalizationPlugin(), storefrontBoundaryPlugin(), react()],
});
