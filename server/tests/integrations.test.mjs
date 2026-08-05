import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import {
  createCloudinaryMediaService,
  optimizeCloudinaryDeliveryUrl,
  serializeCloudinarySignatureParams,
  signCloudinaryParameters,
} from "../services/cloudinary-media.js";
import { createRedisCache } from "../services/redis-cache.js";
import { createCatalogRouter } from "../modules/catalog/routes.js";

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function redisFetchFixture() {
  const values = new Map();
  const calls = [];
  const fetchImpl = async (_url, options) => {
    const command = JSON.parse(options.body);
    calls.push(command);
    const [name, ...args] = command;
    if (name === "PING") return jsonResponse({ result: "PONG" });
    if (name === "GET") return jsonResponse({ result: values.get(args[0]) ?? null });
    if (name === "SET") {
      values.set(args[0], args[1]);
      return jsonResponse({ result: "OK" });
    }
    if (name === "DEL") {
      let deleted = 0;
      for (const key of args) deleted += Number(values.delete(key));
      return jsonResponse({ result: deleted });
    }
    return jsonResponse({ error: `Unsupported test command: ${name}` }, 400);
  };
  return { calls, fetchImpl, values };
}

test("Redis cache stores JSON, reports hits, and invalidates namespaced keys", async () => {
  const fixture = redisFetchFixture();
  const cache = createRedisCache({
    url: "https://redis.example.test",
    token: "test-token",
    namespace: "bj:test",
    fetchImpl: fixture.fetchImpl,
    logger: { warn() {} },
  });
  let loads = 0;

  const first = await cache.remember("catalog", async () => {
    loads += 1;
    return [{ id: 1, name: "Television" }];
  });
  const second = await cache.remember("catalog", async () => {
    loads += 1;
    return [];
  });

  assert.equal(first.status, "MISS");
  assert.equal(second.status, "HIT");
  assert.equal(loads, 1);
  assert.deepEqual(second.value, first.value);
  assert.ok(fixture.values.has("bj:test:catalog"));

  await cache.delete("catalog");
  assert.equal(fixture.values.has("bj:test:catalog"), false);
  assert.deepEqual(await cache.health(), { status: "ok" });
});

test("Redis cache fails open when the external service is unavailable", async () => {
  const cache = createRedisCache({
    url: "https://redis.example.test",
    token: "test-token",
    fetchImpl: async () => { throw new Error("network unavailable"); },
    logger: { warn() {} },
  });

  const result = await cache.remember("catalog", async () => ["database-value"]);
  assert.equal(result.status, "MISS");
  assert.deepEqual(result.value, ["database-value"]);
  assert.equal((await cache.health()).status, "degraded");
});

test("catalog responses use Redis cache-aside semantics", async () => {
  const fixture = redisFetchFixture();
  const cache = createRedisCache({
    url: "https://redis.example.test",
    token: "test-token",
    fetchImpl: fixture.fetchImpl,
    logger: { warn() {} },
  });
  let databaseReads = 0;
  const repository = {
    async listProducts() {
      databaseReads += 1;
      return [{ id: 1, name: "Cached product" }];
    },
  };
  const app = express();
  app.use("/api/products", createCatalogRouter(repository, { cache }));

  const first = await request(app).get("/api/products").expect(200);
  const second = await request(app).get("/api/products").expect(200);

  assert.equal(first.headers["x-cache"], "MISS");
  assert.equal(second.headers["x-cache"], "HIT");
  assert.equal(databaseReads, 1);
});

test("Cloudinary signatures use sorted SHA-256 parameters without exposing the secret", () => {
  const parameters = {
    timestamp: 1_725_000_000,
    folder: "bj-electronics/products",
    overwrite: "false",
  };
  assert.equal(
    serializeCloudinarySignatureParams(parameters),
    "folder=bj-electronics/products&overwrite=false&timestamp=1725000000",
  );
  assert.equal(
    signCloudinaryParameters(parameters, "private-secret", "sha256"),
    "d1bd50519addea175115ca8e6bf406acd395dc00c76ab3a52664c122e1d2e654",
  );
});

test("Cloudinary media service creates signed browser upload configuration", () => {
  const media = createCloudinaryMediaService({
    cloudName: "bj-cloud",
    apiKey: "123456",
    apiSecret: "private-secret",
    folder: "bj-electronics/products",
    clock: () => 1_725_000_000_000,
  });
  const upload = media.createUploadSignature({ resourceType: "image" });

  assert.equal(upload.cloudName, "bj-cloud");
  assert.equal(upload.parameters.timestamp, 1_725_000_000);
  assert.equal(upload.signatureAlgorithm, "sha256");
  assert.equal(upload.uploadUrl, "https://api.cloudinary.com/v1_1/bj-cloud/image/upload");
  assert.equal(Object.hasOwn(upload, "apiSecret"), false);
  assert.equal(media.enabled, true);
});

test("Cloudinary delivery URLs receive automatic format and quality optimization", () => {
  assert.equal(
    optimizeCloudinaryDeliveryUrl("https://res.cloudinary.com/demo/image/upload/v1/product.jpg"),
    "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:good,c_limit,w_1600/v1/product.jpg",
  );
  assert.equal(optimizeCloudinaryDeliveryUrl("/assets/local.jpg"), "/assets/local.jpg");
});
