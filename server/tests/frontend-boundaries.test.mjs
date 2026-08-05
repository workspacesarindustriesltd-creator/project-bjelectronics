import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { transformStorefrontSource } from "../../scripts/storefront-boundary-plugin.mjs";
import { transformAdminSource } from "../../scripts/admin-boundary-plugin.mjs";

const root = process.cwd();

async function source(file) {
  return readFile(path.join(root, file), "utf8");
}

test("storefront build excludes administrator links, routes, content, and data", async () => {
  const transformed = transformStorefrontSource(await source("src/App.jsx"));

  for (const forbidden of [
    "/api/admin",
    "adminLoginUrl",
    "Administrator portal",
    "Commerce control center",
    "function AdminDashboard",
    "demoCustomers",
  ]) {
    assert.doesNotMatch(transformed, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(transformed, /\/api\/auth\/\$\{mode\}/);
  assert.match(transformed, /Create account/);
  assert.match(transformed, /Sign in securely/);
});

test("administrator build excludes bundled credentials and demo session bypasses", async () => {
  const transformed = transformAdminSource(await source("src/AdminApp.jsx"));

  for (const forbidden of [
    "admin@bjelectronics.shop",
    "admin12345",
    "bj-admin-demo",
    "Local preview credentials are prefilled",
  ]) {
    assert.doesNotMatch(transformed, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(transformed, /\/api\/admin\/auth\/login/);
  assert.match(transformed, /Administrator access/);
  assert.match(transformed, /setUser\(null\)/);
});
