
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import worker from "../worker/index.js";

function assets(calls) {
  return {
    fetch: async (request) => {
      const path = new URL(request.url).pathname;
      calls.push(path);
      const known = ["/index.html", "/admin/index.html", "/assets/app.js"];
      return new Response(known.includes(path) ? path : "missing", { status: known.includes(path) ? 200 : 404 });
    },
  };
}

test("serves existing static assets without fallback", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://www.bjelectronics.shop/assets/app.js"), { ASSETS: assets(calls) });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["/assets/app.js"]);
});

test("routes storefront navigation to the storefront shell", async () => {
  const calls = [];
  const response = await worker.fetch(new Request("https://www.bjelectronics.shop/products/laptop", { headers: { accept: "text/html" } }), { ASSETS: assets(calls) });
  assert.equal(await response.text(), "/index.html");
  assert.deepEqual(calls, ["/products/laptop", "/index.html"]);
});

test("routes administrator hostname and paths to the separate admin shell", async () => {
  for (const url of ["https://admin.bjelectronics.shop/", "https://www.bjelectronics.shop/admin/dashboard"]) {
    const calls = [];
    const response = await worker.fetch(new Request(url, { headers: { accept: "text/html" } }), { ASSETS: assets(calls) });
    assert.equal(await response.text(), "/admin/index.html");
    assert.equal(calls.at(-1), "/admin/index.html");
  }
});

test("does not convert missing API or write requests into an app shell", async () => {
  for (const request of [
    new Request("https://www.bjelectronics.shop/api/missing", { headers: { accept: "application/json" } }),
    new Request("https://www.bjelectronics.shop/flow", { method: "POST", headers: { accept: "text/html" } }),
  ]) {
    const calls = [];
    const response = await worker.fetch(request, { ASSETS: assets(calls) });
    assert.equal(response.status, 404);
    assert.equal(calls.length, 1);
  }
});

test("emits separate production application shells and Sites metadata", async () => {
  await access(new URL("../dist/client/index.html", import.meta.url));
  await access(new URL("../dist/client/admin/index.html", import.meta.url));
  await access(new URL("../dist/server/index.js", import.meta.url));
  await access(new URL("../dist/.openai/hosting.json", import.meta.url));
});
