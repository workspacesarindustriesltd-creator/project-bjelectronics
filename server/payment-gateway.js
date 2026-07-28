import crypto from "node:crypto";
import SSLCommerzPayment from "sslcommerz-lts";
import { config } from "./config.js";

export class SSLCommerzGateway {
  constructor(settings = config.sslcommerz) {
    this.settings = settings;
  }

  get configured() {
    return Boolean(this.settings.storeId && this.settings.storePassword);
  }

  client() {
    if (!this.configured) {
      throw new Error("SSLCOMMERZ credentials are not configured. Add them to .env.");
    }
    return new SSLCommerzPayment(
      this.settings.storeId,
      this.settings.storePassword,
      this.settings.isLive,
    );
  }

  async initiate(order) {
    const transactionId = `BJ${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`.slice(0, 30);
    const callbackBase = `${config.publicApiUrl}/api/payments/sslcommerz`;
    const data = {
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
    const response = await this.client().init(data);
    if (!response?.GatewayPageURL) throw new Error(response?.failedreason || "SSLCOMMERZ did not return a payment URL.");
    return {
      transactionId,
      sessionKey: response.sessionkey,
      gatewayUrl: response.GatewayPageURL,
      raw: response,
    };
  }

  async validate(validationId) {
    return this.client().validate({ val_id: validationId });
  }
}
