import test from "node:test";
import assert from "node:assert/strict";
import { SSLCommerzGateway } from "../payment-gateway.js";

const order = {
  id: "order-1",
  orderNumber: "BJ-TEST-1",
  total: 1295.99,
  currency: "BDT",
  customer: {
    name: "BJ Customer",
    email: "demo@bjelectronics.shop",
    phone: "01700000000",
    address: "Karwan Bazar",
    city: "Dhaka",
    state: "Dhaka",
    postcode: "1215",
    country: "Bangladesh",
  },
  lines: [{ product: { name: "MacBook Air M2" }, quantity: 1 }],
};

test("initiates a sandbox session through the official v4 API", async () => {
  let request;
  const gateway = new SSLCommerzGateway(
    { storeId: "test-store", storePassword: "test-password", isLive: false },
    async (url, options) => {
      request = { url: String(url), options };
      return new Response(JSON.stringify({
        status: "SUCCESS",
        sessionkey: "session-1",
        GatewayPageURL: "https://sandbox.sslcommerz.com/EasyCheckOut/test",
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  );

  const result = await gateway.initiate(order);
  assert.equal(request.url, "https://sandbox.sslcommerz.com/gwprocess/v4/api.php");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.body.get("store_id"), "test-store");
  assert.equal(request.options.body.get("store_passwd"), "test-password");
  assert.equal(request.options.body.get("currency"), "BDT");
  assert.equal(request.options.body.get("value_a"), "order-1");
  assert.equal(result.sessionKey, "session-1");
  assert.equal(result.gatewayUrl, "https://sandbox.sslcommerz.com/EasyCheckOut/test");
});

test("validates payments through the live validation API", async () => {
  let requestUrl;
  const gateway = new SSLCommerzGateway(
    { storeId: "live-store", storePassword: "live-password", isLive: true },
    async (url) => {
      requestUrl = new URL(url);
      return new Response(JSON.stringify({
        status: "VALID",
        tran_id: "BJ-TEST-1",
        amount: "1295.99",
        currency: "BDT",
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  );

  const validation = await gateway.validate("validation-1");
  assert.equal(requestUrl.origin, "https://securepay.sslcommerz.com");
  assert.equal(requestUrl.pathname, "/validator/api/validationserverAPI.php");
  assert.equal(requestUrl.searchParams.get("val_id"), "validation-1");
  assert.equal(requestUrl.searchParams.get("store_id"), "live-store");
  assert.equal(requestUrl.searchParams.get("format"), "json");
  assert.equal(validation.status, "VALID");
});

test("rejects malformed gateway responses", async () => {
  const gateway = new SSLCommerzGateway(
    { storeId: "test-store", storePassword: "test-password", isLive: false },
    async () => new Response("not-json", { status: 200 }),
  );

  await assert.rejects(() => gateway.initiate(order), /invalid session initiation response/);
});
