import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = path.resolve(process.cwd());

async function read(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

test("Hostinger Business deployment uses the tested Node.js runtime", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  assert.equal(packageJson.engines.node, ">=22.12 <23");
  assert.equal(packageJson.main, "index.js");
  assert.equal(packageJson.scripts["hostinger:build"], "npm run check && npm run security:audit");
  assert.equal(packageJson.scripts.start, "node index.js");
});

test("Hostinger production URLs use one apex origin with path-based admin and API routing", async () => {
  const env = await read("deploy/hostinger-business.env.example");
  const expected = [
    "STORE_URL=https://bjelectronics.shop",
    "ADMIN_URL=https://bjelectronics.shop",
    "PUBLIC_API_URL=https://bjelectronics.shop",
    "VITE_STORE_URL=https://bjelectronics.shop",
    "VITE_ADMIN_URL=https://bjelectronics.shop",
  ];

  for (const value of expected) assert.match(env, new RegExp(`^${value}$`, "m"));
  assert.doesNotMatch(env, /https:\/\/www\.bjelectronics\.shop/);
  assert.doesNotMatch(env, /=(?:https:\/\/bjelectronics\.shop)\/(?:admin|api)\/?$/m);
});

test("managed database SQL does not select or create a fixed database name", async () => {
  const files = [
    "database/schema.sql",
    "database/seeds/seed.sql",
    "database/migrations/003_caravan_catalog.sql",
    "database/migrations/004_remove_online_payment_gateway.sql",
  ];

  for (const file of files) {
    const sql = await read(file);
    assert.doesNotMatch(sql, /\bCREATE\s+DATABASE\b/i, file);
    assert.doesNotMatch(sql, /\bUSE\s+bj_electronics\b/i, file);
  }
});

test("payment removal migration tolerates an already-upgraded schema", async () => {
  const sql = await read("database/migrations/004_remove_online_payment_gateway.sql");
  assert.match(sql, /DROP COLUMN IF EXISTS payment_provider/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS payment_method/i);
});
