import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SecretVault } from "../services/secret-vault.js";

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), "utf8");

test("administrator vault encrypts authenticated data and rejects tampering", () => {
  const vault = new SecretVault("this-is-a-long-test-vault-secret-with-more-than-32-characters");
  const encrypted = vault.encrypt({ token: "private-token", nested: { enabled: true } });
  assert.match(encrypted, /^v1\./);
  assert.doesNotMatch(encrypted, /private-token/);
  assert.deepEqual(vault.decrypt(encrypted), { token: "private-token", nested: { enabled: true } });

  const parts = encrypted.split(".");
  parts[3] = `${parts[3].slice(0, -1)}${parts[3].endsWith("A") ? "B" : "A"}`;
  assert.deepEqual(vault.decrypt(parts.join("."), { invalid: true }), { invalid: true });
});

test("enterprise RBAC, settings, audit, OAuth and integration schemas are present", async () => {
  const [repository, migration, control, oauth, bootstrap] = await Promise.all([
    read("server/modules/admin/control-repository.js"),
    read("database/migrations/005_enterprise_admin_control.sql"),
    read("server/modules/admin/control-center.js"),
    read("server/modules/auth/admin-oauth.js"),
    read("server/modules/admin/bootstrap.js"),
  ]);

  for (const permission of [
    "orders.write", "catalog.import", "storefront.manage", "integrations.manage",
    "users.manage", "audit.read", "settings.manage",
  ]) assert.match(repository, new RegExp(permission.replace(".", "\\.")));

  for (const role of ["super_admin", "store_manager", "catalog_manager", "fulfillment", "marketing", "analyst"]) {
    assert.match(repository, new RegExp(role));
  }

  for (const table of [
    "admin_roles", "admin_permissions", "admin_user_roles", "admin_audit_logs",
    "store_settings", "integration_connections", "oauth_accounts",
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(repository, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }

  for (const provider of ["redis", "cloudinary", "google_oauth", "github_oauth", "github_api", "smtp", "sslcommerz", "pathao", "steadfast", "redx"]) {
    assert.match(control, new RegExp(`${provider}:`));
  }

  assert.match(control, /integration\.test\.success/);
  assert.match(control, /integration\.test\.failed/);
  assert.match(control, /\/integrations\/:provider\/test/);
  assert.match(control, /createStorefrontConfigRouter/);
  assert.match(bootstrap, /getAuthorization/);
  assert.doesNotMatch(bootstrap, /allow\("dashboard\.read"\)/);

  assert.match(oauth, /OAuth state validation failed/);
  assert.match(oauth, /email_verified !== true/);
  assert.match(oauth, /user:email/);
  assert.match(oauth, /user\.role !== "admin"/);
  assert.match(oauth, /This verified account is not assigned/);
  assert.match(oauth, /sameSite: "lax"/);
});

test("runtime integrations hot reload Redis and Cloudinary without exposing credentials", async () => {
  const [runtime, admin, client, environment] = await Promise.all([
    read("server/services/runtime-integrations.js"),
    read("src/admin-enterprise/AdminEnterprise.jsx"),
    read("src/shared/client.js"),
    read("deploy/hostinger-business.env.example"),
  ]);

  assert.match(runtime, /invalidateConfiguration/);
  assert.match(runtime, /createRuntimeRedisCache/);
  assert.match(runtime, /createRuntimeCloudinaryMedia/);
  assert.match(admin, /Stored encrypted in the administrator vault/);
  assert.match(admin, /Runtime-capable connectors refresh without a rebuild/);
  assert.match(client, /credentials: "include"/);
  assert.match(environment, /ADMIN_VAULT_KEY/);
  assert.match(environment, /OAUTH_CALLBACK_BASE_URL/);

  for (const secret of ["apiSecret", "clientSecret", "storePassword", "secretKey", "password", "token"]) {
    assert.doesNotMatch(admin, new RegExp(`process\\.env\\.${secret}`, "i"));
  }
});

test("enterprise administrator source contains complete operational surfaces", async () => {
  const [app, primitives, css, storefront] = await Promise.all([
    read("src/admin-enterprise/AdminEnterprise.jsx"),
    read("src/admin-enterprise/ui.jsx"),
    read("src/admin-enterprise/admin-enterprise.css"),
    read("src/store/runtime-config.js"),
  ]);

  for (const surface of [
    "DashboardPage", "OrdersPage", "ProductsPage", "CustomersPage", "PromotionsPage",
    "CustomizationPage", "IntegrationsPage", "AdministratorsPage", "AuditPage", "SystemPage",
    "CommandPalette", "MediaManager", "CatalogOperations",
  ]) assert.match(app, new RegExp(surface));

  for (const primitive of ["Button", "Card", "Badge", "Input", "Textarea", "Select", "Switch", "Tabs", "Dialog", "Sheet", "DataTable", "ToastProvider"]) {
    assert.match(primitives, new RegExp(`export (?:const|function) ${primitive}`));
  }

  assert.match(primitives, /disabled=\{loading \|\| disabled\}/);
  assert.match(primitives, /aria-label=\{label\}/);
  assert.match(primitives, /aria-modal="true"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(storefront, /\/api\/storefront\/config/);
  assert.match(storefront, /window\.__BJ_STOREFRONT_CONFIG__/);
});
