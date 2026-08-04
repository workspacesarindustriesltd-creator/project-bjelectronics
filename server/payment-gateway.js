import crypto from "node:crypto";
import { config } from "./config.js";

const endpoints = (isLive) => {
  const host = isLive ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";
  return {
    initiate: `${host}/gwprocess/v4/api.php`,
    validate: `${host}/validator/api/validationserverAPI.php`,
  };
};

const toFormBody = (values) => {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) body.set(key, String(value));
  }
  return body;
};

async function readJson(response, operation) {
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`SSLCOMMERZ returned an invalid ${operation} response.`);
  }
  if (!response.ok) {
    throw new Error(payload?.failedreason || payload?.error || `SSLCOMMERZ ${operation} failed with HTTP ${response.status}.`);
  }
  return payload;
}

export class SSLCommerzGateway {
  constructor(settings = config.sslcommerz, fetchImplementation = globalThis.fetch) {
    this.settings = settings;
    this.fetch = fetchImplementation;
  }

  get configured() {
    return Boolean(this.settings.storeId && this.settings.storePassword);
  }

  assertConfigured() {
    if (!this.configured) {
      throw new Error("SSLCOMMERZ credentials are not configured. Add them to .env.");
    }
    if (typeof this.fetch !== "function") {
      throw new Error("This Node.js runtime does not provide the Fetch API required for SSLCOMMERZ.");
    }
  }

  async initiate(order) {
    this.assertConfigured();
    const transactionId = `BJ${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`.slice(0, 30);
    const callbackBase = `${config.publicApiUrl}/api/payments/sslcommerz`;
    const data = {
      store_id: this.settings.storeId,
      store_passwd: this.settings.storePassword,
      total_amount: order.total,
      currency: order.currency,
      tran_id: transactionId,
      success_url: `${callbackBase}/success`,
      fail_url: `${callbackBase}/fail`,
      cancel_url: `${callbackBase}/cancel`,
      ipn_url: `${callbackBase}/ipn`,
      shipping_method: "Courier",
      product_name: order.lines.map((line) => line.product.name).join(", ").slice(0, 250),
      product_category: "Electronics",
      product_profile: "physical-goods",
      num_of_item: order.lines.reduce((sum, line) => sum + line.quantity, 0),
      cus_name: order.customer.name,
      cus_email: order.customer.email,
      cus_add1: order.customer.address,
      cus_city: order.customer.city,
      cus_state: order.customer.state || order.customer.city,
      cus_postcode: order.customer.postcode,
      cus_country: order.customer.country || "Bangladesh",
      cus_phone: order.customer.phone,
      ship_name: order.customer.name,
      ship_add1: order.customer.address,
      ship_city: order.customer.city,
      ship_state: order.customer.state || order.customer.city,
      ship_postcode: order.customer.postcode,
      ship_country: order.customer.country || "Bangladesh",
      value_a: order.id,
      value_b: order.orderNumber,
    };

    const response = await this.fetch(endpoints(this.settings.isLive).initiate, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: toFormBody(data),
      signal: AbortSignal.timeout(30_000),
    });
    const payload = await readJson(response, "session initiation");
    if (!payload?.GatewayPageURL) {
      throw new Error(payload?.failedreason || "SSLCOMMERZ did not return a payment URL.");
    }
    return {
      transactionId,
      sessionKey: payload.sessionkey,
      gatewayUrl: payload.GatewayPageURL,
      raw: payload,
    };
  }

  async validate(validationId) {
    this.assertConfigured();
    const url = new URL(endpoints(this.settings.isLive).validate);
    url.search = toFormBody({
      val_id: validationId,
      store_id: this.settings.storeId,
      store_passwd: this.settings.storePassword,
      v: 1,
      format: "json",
    }).toString();
    const response = await this.fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    return readJson(response, "payment validation");
  }
}
