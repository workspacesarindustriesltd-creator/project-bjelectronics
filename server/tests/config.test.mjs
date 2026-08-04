import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const evaluateConfig = `
  import("./server/config.js")
    .then(({ config }) => process.stdout.write(JSON.stringify(config)))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
`;

function runConfig(environment) {
  return spawnSync(process.execPath, ["--input-type=module", "--eval", evaluateConfig], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      DOTENV_CONFIG_QUIET: "true",
      STORE_URL: "",
      ADMIN_URL: "",
      PUBLIC_API_URL: "",
      JWT_SECRET: "",
      ...environment,
    },
  });
}

test("rejects production without a JWT secret", () => {
  const result = runConfig({ NODE_ENV: "production" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /JWT_SECRET is required/);
});

test("rejects production without deployment URLs", () => {
  const result = runConfig({
    NODE_ENV: "production",
    JWT_SECRET: "a-secure-random-secret-with-32-characters",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /STORE_URL is required/);
});

test("rejects weak production JWT secrets", () => {
  const result = runConfig({
    NODE_ENV: "production",
    STORE_URL: "https://www.bjelectronics.shop",
    ADMIN_URL: "https://admin.bjelectronics.shop",
    PUBLIC_API_URL: "https://www.bjelectronics.shop",
    JWT_SECRET: "too-short",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /at least 32 characters/);
});

test("accepts secure production configuration", () => {
  const result = runConfig({
    NODE_ENV: "production",
    STORE_URL: "https://www.bjelectronics.shop",
    ADMIN_URL: "https://admin.bjelectronics.shop",
    PUBLIC_API_URL: "https://www.bjelectronics.shop",
    JWT_SECRET: "a-secure-random-secret-with-32-characters",
  });
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  assert.equal(config.storeUrl, "https://www.bjelectronics.shop");
  assert.equal(config.adminUrl, "https://admin.bjelectronics.shop");
});

test("normalizes store and administrator URLs to browser origins", () => {
  const result = runConfig({
    NODE_ENV: "test",
    STORE_URL: "http://localhost:5173/store",
    ADMIN_URL: "http://localhost:5173/admin",
    PUBLIC_API_URL: "http://localhost:4000/base/",
    JWT_SECRET: "test-secret",
  });
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  assert.equal(config.storeUrl, "http://localhost:5173");
  assert.equal(config.adminUrl, "http://localhost:5173");
  assert.equal(config.publicApiUrl, "http://localhost:4000/base");
});
