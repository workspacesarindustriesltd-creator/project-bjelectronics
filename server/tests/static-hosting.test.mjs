import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { createSession } from "../auth.js";

const staticRoot = path.resolve(process.cwd(), "dist", "client");
const app = createApp({ repository: {}, staticRoot });
const adminToken = createSession(
  {
    id: "admin-static-test",
    name: "Administrator",
    email: "admin-test@example.com",
    role: "admin",
  },
  "bj-electronics-admin",
  "2h",
);
const adminCookie = `bj_admin_session=${adminToken}`;

test("serves the storefront shell from the managed Node.js process", async () => {
  const response = await request(app)
    .get("/")
    .set("Accept", "text/html")
    .expect(200);

  assert.match(response.text, /BJ Electronics/i);
  assert.match(response.headers["cache-control"], /no-cache/);
});

test("redirects unauthenticated administrator navigation to the public login page", async () => {
  await request(app)
    .get("/admin/orders")
    .set("Accept", "text/html")
    .redirects(0)
    .expect(303)
    .expect("Location", "/admin/login?returnTo=%2Fadmin%2Forders");
});

test("serves protected administrator routes only with an administrator session", async () => {
  const response = await request(app)
    .get("/admin/orders")
    .set("Accept", "text/html")
    .set("Cookie", adminCookie)
    .expect(200);

  assert.match(response.text, /BJ Admin/i);
  assert.match(response.headers["cache-control"], /no-store/);
  assert.match(response.headers["x-robots-tag"], /noindex/);
});

test("keeps the administrator login shell public and non-cacheable", async () => {
  const response = await request(app)
    .get("/admin/login")
    .set("Accept", "text/html")
    .expect(200);

  assert.match(response.text, /BJ Admin/i);
  assert.match(response.headers["cache-control"], /no-store/);
  assert.match(response.headers["x-robots-tag"], /noindex/);
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
  assert.match(response.headers["cache-control"], /no-store/);
  assert.match(response.headers["x-robots-tag"], /noindex/);
});
