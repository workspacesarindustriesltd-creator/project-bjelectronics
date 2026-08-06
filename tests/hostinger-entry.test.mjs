import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Hostinger can require the generated ESM bootstrap without ERR_REQUIRE_ASYNC_MODULE", () => {
  const builtEntry = path.join(root, "dist", "index.js");
  const builtSource = readFileSync(builtEntry, "utf8");

  assert.match(builtSource, /import\("\.\/runtime\/server\/index\.js"\)/);
  assert.doesNotMatch(builtSource, /^\s*import\s+["']\.\/runtime\/server\/index\.js["']/m);

  const fixture = mkdtempSync(path.join(os.tmpdir(), "bj-hostinger-entry-"));

  try {
    mkdirSync(path.join(fixture, "runtime", "server"), { recursive: true });
    copyFileSync(builtEntry, path.join(fixture, "index.js"));
    writeFileSync(path.join(fixture, "package.json"), '{"type":"module"}\n');
    writeFileSync(
      path.join(fixture, "runtime", "server", "index.js"),
      'await new Promise((resolve) => setTimeout(resolve, 10));\nconsole.log("HOSTINGER_BOOTSTRAP_OK");\n',
    );
    writeFileSync(
      path.join(fixture, "loader.cjs"),
      'require("./index.js");\nsetTimeout(() => {}, 50);\n',
    );

    const result = spawnSync(process.execPath, ["loader.cjs"], {
      cwd: fixture,
      encoding: "utf8",
      timeout: 5_000,
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.doesNotMatch(result.stderr, /ERR_REQUIRE_ASYNC_MODULE/);
    assert.match(result.stdout, /HOSTINGER_BOOTSTRAP_OK/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
