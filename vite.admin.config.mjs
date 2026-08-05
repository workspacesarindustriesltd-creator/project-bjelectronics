import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { adminBoundaryPlugin } from "./scripts/admin-boundary-plugin.mjs";
import { adminMediaPlugin } from "./scripts/admin-media-plugin.mjs";
import { adminUiNormalizationPlugin } from "./scripts/admin-ui-normalization-plugin.mjs";
import { adminEnterpriseNormalizationPlugin } from "./scripts/admin-enterprise-normalization-plugin.mjs";

const resolve = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: resolve("./apps/admin"),
  base: "/admin/",
  publicDir: resolve("./public"),
  build: {
    outDir: resolve("./dist/admin-client"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5174,
    allowedHosts: ["terminal.local"],
    proxy: { "/api": "http://localhost:4000" },
  },
  plugins: [
    adminEnterpriseNormalizationPlugin(),
    adminUiNormalizationPlugin(),
    adminBoundaryPlugin(),
    adminMediaPlugin(),
    react(),
  ],
});
