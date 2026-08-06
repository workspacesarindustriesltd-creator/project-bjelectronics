import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import request from "supertest";
import { createRateLimiters, mutationOnly } from "../http/rate-limiters.js";

test("authentication limiter returns structured retry information", async () => {
  const app = express();
  const limiters = createRateLimiters({ windowMs: 60_000, authLimit: 1 });
  app.post("/login", limiters.authentication, (_req, res) => res.status(401).json({ error: "invalid" }));

  await request(app).post("/login").expect(401);
  const response = await request(app).post("/login").expect(429);
  assert.equal(response.body.code, "RATE_LIMIT_EXCEEDED");
  assert.equal(response.body.path, "/login");
  assert.match(response.body.error, /authentication attempts/i);
});

test("mutationOnly does not consume write quota for reads", async () => {
  const app = express();
  const limiters = createRateLimiters({ windowMs: 60_000, adminWriteLimit: 1 });
  app.use(mutationOnly(limiters.adminWrite));
  app.get("/resource", (_req, res) => res.json({ ok: true }));
  app.post("/resource", (_req, res) => res.status(201).json({ ok: true }));

  await request(app).get("/resource").expect(200);
  await request(app).get("/resource").expect(200);
  await request(app).post("/resource").expect(201);
  const response = await request(app).post("/resource").expect(429);
  assert.equal(response.body.code, "RATE_LIMIT_EXCEEDED");
});
