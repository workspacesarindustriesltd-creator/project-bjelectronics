import { readFileSync } from "node:fs";
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

function runConfig(environment = {}) {
  return spawnSync(process.execPath, ["--input-type=module", "--eval", evaluateConfig], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      DOTENV_CONFIG_QUIET: "true",
      NODE_ENV: "test",
      STORE_URL: "http://localhost:5173",
      ADMIN_URL: "http://localhost:5174",
      PUBLIC_API_URL: "http://localhost:4000",
      JWT_SECRET: "test-secret",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
      REDIS_REQUIRED: "false",
      CLOUDINARY_CLOUD_NAME: "",
      CLOUDINARY_API_KEY: "",
      CLOUDINARY_API_SECRET: "",
      CLOUDINARY_REQUIRED: "false",
      ...environment,
    },
  });
}

const productionBase = {
  NODE_ENV: "production",
  STORE_URL: "https://bjelectronics.shop",
  ADMIN_URL: "https://bjelectronics.shop",
  PUBLIC_API_URL: "https://bjelectronics.shop",
  JWT_SECRET: "a-secure-random-secret-with-at-least-32-characters",
};

test("rejects partial Redis REST configuration", () => {
  const result = runConfig({ UPSTASH_REDIS_REST_URL: "https://redis.example.test" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must be configured together/);
});

test("rejects partial Cloudinary configuration", () => {
  const result = runConfig({
    CLOUDINARY_CLOUD_NAME: "bj-cloud",
    CLOUDINARY_API_KEY: "123456",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must be configured together/);
});

test("enforces required production integrations", () => {
  const redis = runConfig({ ...productionBase, REDIS_REQUIRED: "true" });
  assert.notEqual(redis.status, 0);
  assert.match(redis.stderr, /Redis is required/);

  const cloudinary = runConfig({ ...productionBase, CLOUDINARY_REQUIRED: "true" });
  assert.notEqual(cloudinary.status, 0);
  assert.match(cloudinary.stderr, /Cloudinary is required/);
});

test("accepts complete production Redis and Cloudinary configuration", () => {
  const result = runConfig({
    ...productionBase,
    UPSTASH_REDIS_REST_URL: "https://redis.example.test",
    UPSTASH_REDIS_REST_TOKEN: "redis-token",
    REDIS_REQUIRED: "true",
    CLOUDINARY_CLOUD_NAME: "bj-cloud",
    CLOUDINARY_API_KEY: "123456",
    CLOUDINARY_API_SECRET: "cloudinary-secret",
    CLOUDINARY_REQUIRED: "true",
  });
  assert.equal(result.status, 0, result.stderr);
  const config = JSON.parse(result.stdout);
  assert.equal(config.redis.restUrl, "https://redis.example.test");
  assert.equal(config.redis.required, true);
  assert.equal(config.cloudinary.cloudName, "bj-cloud");
  assert.equal(config.cloudinary.signatureAlgorithm, "sha256");
});

test("Hostinger production template contains all external service variables", () => {
  const env = readFileSync(new URL("../../deploy/hostinger-business.env.example", import.meta.url), "utf8");
  for (const name of [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "REDIS_REQUIRED=true",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
    "CLOUDINARY_SIGNATURE_ALGORITHM=sha256",
    "CLOUDINARY_REQUIRED=true",
  ]) {
    assert.match(env, new RegExp(`^${name}`, "m"));
  }
  assert.doesNotMatch(env, /localhost:6379|redis:\/\//);
});
