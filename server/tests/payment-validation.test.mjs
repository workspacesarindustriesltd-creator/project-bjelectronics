import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";

function fixture(validation) {
  const state = { completed: false, failed: null };
  const repository = {
    findOrderForPayment: async (transactionId) => transactionId === "BJEXPECTED"
      ? { id: "order-1", order_number: "BJ-ORDER-1", total_amount: 100, currency: "BDT" }
      : null,
    markPaymentFailed: async (...args) => {
      state.failed = args;
    },
    completePayment: async () => {
      state.completed = true;
    },
  };
  const paymentGateway = {
    settings: { isLive: false },
    validate: async () => validation,
  };
  return { app: createApp({ repository, paymentGateway }), state };
}

test("rejects a validated payment with a mismatched transaction ID", async () => {
  const { app, state } = fixture({
    status: "VALID",
    tran_id: "BJTAMPERED",
    amount: "100.00",
    currency: "BDT",
    risk_level: "0",
  });

  const response = await request(app)
    .post("/api/payments/sslcommerz/ipn")
    .send({ val_id: "validation-1", tran_id: "BJEXPECTED" })
    .expect(422);

  assert.match(response.body.error, /Payment validation failed/);
  assert.equal(state.completed, false);
  assert.deepEqual(state.failed, ["BJEXPECTED", "invalid"]);
});

test("accepts a validated payment only when transaction, amount, and currency match", async () => {
  const { app, state } = fixture({
    status: "VALIDATED",
    tran_id: "BJEXPECTED",
    amount: "100.00",
    currency: "BDT",
    bank_tran_id: "BANK-1",
    card_issuer: "Test Bank",
    risk_level: "0",
  });

  const response = await request(app)
    .post("/api/payments/sslcommerz/ipn")
    .send({ val_id: "validation-2", tran_id: "BJEXPECTED" })
    .expect(200);

  assert.equal(response.body.received, true);
  assert.equal(state.completed, true);
  assert.equal(state.failed, null);
});
