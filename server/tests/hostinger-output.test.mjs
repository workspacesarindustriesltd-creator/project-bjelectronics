import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const readJson = async (url) => JSON.parse(await readFile(url, "utf8"));

test("exposes a conventional root Node.js entrypoint for Hostinger detection", async () => {
  const manifest = await readJson(new URL("../../package.json", import.meta.url));
  assert.equal(manifest.main, "index.js");
  assert.equal(manifest.scripts.start, "node index.js");
  assert.equal(manifest.engines.node, ">=22.12 <23");
  await access(new URL("../../index.js", import.meta.url));
  await access(new URL("../../.nvmrc", import.meta.url));
});

test("emits a self-contained Hostinger output-directory runtime", async () => {
  const sourceManifest = await readJson(new URL("../../package.json", import.meta.url));
  const runtimeManifest = await readJson(new URL("../../dist/package.json", import.meta.url));

  assert.equal(runtimeManifest.name, sourceManifest.name);
  assert.equal(runtimeManifest.version, sourceManifest.version);
  assert.deepEqual(runtimeManifest.dependencies, sourceManifest.dependencies);
  assert.equal(runtimeManifest.main, "index.js");
  assert.equal(runtimeManifest.scripts.start, "node index.js");
  assert.equal(runtimeManifest.scripts["db:migrate"], "node runtime/scripts/migrate.mjs");

  for (const path of [
    "../../dist/package-lock.json",
    "../../dist/index.js",
    "../../dist/.nvmrc",
    "../../dist/runtime/server/index.js",
    "../../dist/runtime/database/schema.sql",
    "../../dist/runtime/scripts/migrate.mjs",
    "../../dist/client/index.html",
    "../../dist/client/admin/index.html",
  ]) {
    await access(new URL(path, import.meta.url));
  }
});
