import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");

test("storefront production entry uses the modular accessible application", async () => {
  const [entry, app, css] = await Promise.all([
    read("apps/store/main.jsx"),
    read("src/store/StoreApp.jsx"),
    read("src/store/store.css"),
  ]);
  assert.match(entry, /StoreApp/);
  assert.match(entry, /store\.css/);
  for (const route of ["/shop", "/checkout", "/wishlist", "/compare", "/track-order", "/account/addresses", "/privacy-policy", "/return-policy", "/terms"]) {
    assert.match(app, new RegExp(route.replaceAll("/", "\\/")));
  }
  for (const endpoint of ["/api/products", "/api/orders", "/api/account/wishlist", "/api/account/addresses", "/api/auth/login", "/api/auth/register"]) {
    assert.match(app, new RegExp(endpoint.replaceAll("/", "\\/")));
  }
  assert.match(app, /Skip to main content/);
  assert.match(app, /aria-live="polite"/);
  assert.match(app, /role="dialog"/);
  assert.doesNotMatch(app, /\/api\/admin/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width:/);
});

test("administrator production entry uses real protected workflows", async () => {
  const [entry, app, css] = await Promise.all([
    read("apps/admin/main.jsx"),
    read("src/admin/AdminPortal.jsx"),
    read("src/admin/admin-portal.css"),
  ]);
  assert.match(entry, /AdminPortal/);
  assert.match(entry, /admin-portal\.css/);
  for (const endpoint of ["/api/admin/products", "/api/admin/orders", "/api/admin/customers", "/api/admin/coupons", "/api/admin/integrations", "/api/admin/auth/login"]) {
    assert.match(app, new RegExp(endpoint.replaceAll("/", "\\/")));
  }
  assert.match(app, /MediaManager/);
  assert.match(app, /role="dialog"/);
  assert.match(app, /aria-live="polite"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width:/);
  for (const forbidden of ["admin@bjelectronics.shop", "admin12345", "CLOUDINARY_API_SECRET", "UPSTASH_REDIS_REST_TOKEN"]) {
    assert.doesNotMatch(app, new RegExp(forbidden));
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
