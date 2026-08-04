import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";

const staticRoot = path.resolve(process.cwd(), "dist", "client");
const app = createApp({ repository: {}, staticRoot });

test("serves the storefront shell from the managed Node.js process", async () => {
  const response = await request(app)
    .get("/")
    .set("Accept", "text/html")
    .expect(200);

  assert.match(response.text, /BJ Electronics/i);
});

test("serves the administrator shell for nested admin routes", async () => {
  await request(app)
    .get("/admin/orders")
    .set("Accept", "text/html")
    .expect(200)
    .expect(/BJ Admin/i);
});

test("redirects the bare administrator path without looping on the trailing slash", async () => {
  await request(app)
    .get("/admin")
    .redirects(0)
    .expect(308)
    .expect("Location", "/admin/");

  await request(app)
    .get("/admin/")
    .redirects(0)
    .set("Accept", "text/html")
    .expect(200)
    .expect(/BJ Admin/i);
});

test("does not replace unknown API responses with a frontend shell", async () => {
  const response = await request(app)
    .get("/api/not-a-real-route")
    .set("Accept", "application/json")
    .expect(404);

  assert.equal(response.body.error, "Route not found.");
});
