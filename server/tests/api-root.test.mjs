import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp({
  repository: {},
  staticRoot: path.resolve(process.cwd(), "dist", "client"),
});

test("serves the API root as non-cacheable JSON even when HTML is accepted", async () => {
  const response = await request(app)
    .get("/api")
    .set("Accept", "text/html,application/json")
    .expect(200)
    .expect("Content-Type", /json/);

  assert.equal(response.body.service, "bj-electronics-api");
  assert.equal(response.body.health, "/api/health");
  assert.match(response.headers["cache-control"], /no-store/);
});
