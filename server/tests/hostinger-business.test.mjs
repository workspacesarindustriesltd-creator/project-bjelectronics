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
  assert.equal(packageJson.engines.node, "20.x");
  assert.equal(packageJson.scripts["hostinger:build"], "npm run check && npm run security:audit");
  assert.equal(packageJson.scripts.start, "node server/index.js");
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
