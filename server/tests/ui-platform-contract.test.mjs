import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");
const responsiveMediaQuery = /@media\s*\(max-width:/;

test("storefront production entry uses the modular accessible application and runtime customization", async () => {
  const [entry, app, css, runtimeConfig] = await Promise.all([
    read("apps/store/main.jsx"),
    read("src/store/StoreApp.jsx"),
    read("src/store/store.css"),
    read("src/store/runtime-config.js"),
  ]);
  assert.match(entry, /StoreApp/);
  assert.match(entry, /initializeStorefrontConfig/);
  assert.match(entry, /store\.css/);
  for (const route of ["/shop", "/checkout", "/wishlist", "/compare", "/track-order", "/account/addresses", "/privacy-policy", "/return-policy", "/terms"]) {
    assert.match(app, new RegExp(route.replaceAll("/", "\\/")));
  }
  for (const endpoint of ["/api/products", "/api/orders", "/api/account/wishlist", "/api/account/addresses"]) {
    assert.match(app, new RegExp(endpoint.replaceAll("/", "\\/")));
  }
  assert.match(app, /\/api\/auth\/\$\{login \? "login" : "register"\}/);
  assert.match(app, /Skip to main content/);
  assert.match(app, /aria-live="polite"/);
  assert.match(app, /role="dialog"/);
  assert.doesNotMatch(app, /\/api\/admin/);
  assert.match(runtimeConfig, /\/api\/storefront\/config/);
  assert.match(runtimeConfig, /--brand/);
  assert.match(runtimeConfig, /meta\("description"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, responsiveMediaQuery);
});

test("administrator production entry uses the enterprise control center and protected workflows", async () => {
  const [entry, app, primitives, css] = await Promise.all([
    read("apps/admin/main.jsx"),
    read("src/admin-enterprise/AdminEnterprise.jsx"),
    read("src/admin-enterprise/ui.jsx"),
    read("src/admin-enterprise/admin-enterprise.css"),
  ]);
  assert.match(entry, /AdminEnterprise/);
  assert.match(app, /MediaManager/);
  assert.match(app, /CatalogOperations/);
  assert.match(app, /CommandPalette/);
  for (const page of ["Store customization", "Integrations", "Administrators & RBAC", "Audit history", "System settings"]) {
    assert.match(app, new RegExp(page.replace(/[&]/g, "&")));
  }
  for (const endpoint of [
    "/api/admin/products", "/api/admin/orders", "/api/admin/customers", "/api/admin/coupons",
    "/api/admin/integrations", "/api/admin/auth/login", "/api/admin/control/bootstrap",
    "/api/admin/control/integrations", "/api/admin/control/roles", "/api/admin/control/audit",
  ]) {
    assert.match(app, new RegExp(endpoint.replaceAll("/", "\\/")));
  }
  assert.match(app, /\/api\/admin\/auth\/oauth\/\$\{provider\}\/start/);
  assert.match(primitives, /role="dialog"/);
  assert.match(primitives, /aria-modal="true"/);
  assert.match(primitives, /aria-live="polite"/);
  assert.match(primitives, /role="switch"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, responsiveMediaQuery);
  for (const forbidden of ["admin@bjelectronics.shop", "admin12345", "CLOUDINARY_API_SECRET", "UPSTASH_REDIS_REST_TOKEN", "GITHUB_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"]) {
    assert.doesNotMatch(app, new RegExp(forbidden));
    assert.doesNotMatch(primitives, new RegExp(forbidden));
  }
});

test("shared browser client centralizes secure API and persistence behavior", async () => {
  const client = await read("src/shared/client.js");
  assert.match(client, /X-CSRF-Token/);
  assert.match(client, /credentials: "include"/);
  assert.match(client, /CSRF_TOKEN_INVALID/);
  assert.match(client, /NETWORK_ERROR/);
  assert.match(client, /localStorage/);
});
