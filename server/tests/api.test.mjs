
import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../app.js";

const passwordHash = await bcrypt.hash("demo12345", 4);

function fixture() {
  const users = [
    { id: "customer-1", name: "BJ Customer", email: "demo@bjelectronics.shop", phone: "01700000000", password_hash: passwordHash, role: "customer" },
    { id: "admin-1", name: "Store Administrator", email: "admin@bjelectronics.shop", phone: "01700000001", password_hash: passwordHash, role: "admin" },
  ];
  const products = [{ id: 1, sku: "BJ-LAP-M2", name: "MacBook Air M2", category: "Laptops", description: "Premium laptop", price: 119999, currency: "BDT", stock: 8, image: "/assets/laptop.webp", active: true, featured: true }];
  const orders = [];
  const addresses = [];
  const wishlist = [];
  const reviews = [];
  const coupons = [{ id: 1, code: "WELCOME20", discountType: "percent", discountValue: 20, minimumOrder: 100, active: true }];
  const repository = {
    findUserByEmail: async (email) => users.find((user) => user.email === email) || null,
    findUserById: async (id) => users.find((user) => user.id === id) || null,
    createUser: async ({ name, email, phone, passwordHash: hash }) => {
      const user = { id: `user-${users.length + 1}`, name, email, phone, password_hash: hash, role: "customer" };
      users.push(user);
      return { id: user.id, name, email, phone, role: user.role };
    },
    listProducts: async () => products,
    placeOrder: async ({ userId, customer, currency, paymentMethod, items }) => {
      const order = { id: `order-${orders.length + 1}`, orderNumber: `BJ-${orders.length + 1}`, userId, customer, customerName: customer.name, currency, paymentMethod, paymentStatus: paymentMethod === "bank_transfer" ? "awaiting_payment" : "pending", status: "confirmed", total: 119999, items, createdAt: new Date().toISOString() };
      orders.push(order);
      return order;
    },
    listOrdersForUser: async (userId) => orders.filter((order) => order.userId === userId),
    getOrderForUser: async (id, userId) => orders.find((order) => order.id === id && order.userId === userId) || null,
    listAddresses: async () => addresses,
    createAddress: async (userId, data) => { const address = { id: `address-${addresses.length + 1}`, userId, ...data }; addresses.push(address); return address; },
    updateAddress: async () => null,
    deleteAddress: async () => false,
    listWishlist: async () => wishlist.map((id) => products.find((product) => product.id === id)),
    addWishlistItem: async (_userId, productId) => { wishlist.push(productId); return true; },
    removeWishlistItem: async (_userId, productId) => { const index = wishlist.indexOf(productId); if (index >= 0) wishlist.splice(index, 1); },
    listProductReviews: async () => reviews,
    createProductReview: async (productId, userId, data) => { const review = { id: `review-${reviews.length + 1}`, productId, userId, name: "BJ Customer", ...data, verifiedPurchase: false }; reviews.push(review); return review; },
    validateCoupon: async (code, subtotal) => code === "WELCOME20" && subtotal >= 100 ? coupons[0] : null,
    listAllOrders: async () => orders,
    updateOrderStatus: async (id, status) => { const order = orders.find((item) => item.id === id); if (!order) return null; order.status = status; return order; },
    listCustomers: async () => users.filter((user) => user.role === "customer"),
    listCoupons: async () => coupons,
    createCoupon: async (data) => ({ id: 2, ...data }),
    updateCoupon: async () => null,
    createProduct: async (data) => ({ id: 2, ...data }),
    updateProduct: async () => null,
  };
  return { app: createApp({ repository }), users, orders };
}

async function customerSession(app) {
  const response = await request(app).post("/api/auth/login").send({ email: "demo@bjelectronics.shop", password: "demo12345" }).expect(200);
  return response.headers["set-cookie"];
}

async function adminSession(app) {
  const response = await request(app).post("/api/admin/auth/login").send({ email: "admin@bjelectronics.shop", password: "demo12345" }).expect(200);
  return response.headers["set-cookie"];
}

test("reports healthy gateway-free API status", async () => {
  const { app } = fixture();
  const response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.checkout, "offline");
});

test("registers and authenticates customers with an HTTP-only cookie", async () => {
  const { app, users } = fixture();
  const response = await request(app).post("/api/auth/register").send({ name: "New Customer", email: "new@example.com", phone: "01711111111", password: "strongpass1" }).expect(201);
  assert.match(response.headers["set-cookie"][0], /bj_session=/);
  assert.equal(users.length, 3);
});

test("keeps customer and administrator sessions isolated", async () => {
  const { app } = fixture();
  const cookie = await customerSession(app);
  await request(app).get("/api/admin/products").set("Cookie", cookie).expect(401);
  const adminCookie = await adminSession(app);
  await request(app).get("/api/admin/products").set("Cookie", adminCookie).expect(200);
});

test("places cash-on-delivery orders without an external payment session", async () => {
  const { app, orders } = fixture();
  const cookie = await customerSession(app);
  const response = await request(app).post("/api/orders").set("Cookie", cookie).send({
    items: [{ productId: 1, quantity: 1 }],
    currency: "BDT",
    paymentMethod: "cash_on_delivery",
    customer: { name: "BJ Customer", email: "demo@bjelectronics.shop", phone: "01700000000", address: "House 18, Road 7", city: "Dhaka", state: "Dhaka", postcode: "1209", country: "Bangladesh" },
  }).expect(201);
  assert.equal(response.body.order.status, "confirmed");
  assert.equal(response.body.order.paymentMethod, "cash_on_delivery");
  assert.equal(orders.length, 1);
});

test("supports bank-transfer order placement with awaiting-payment state", async () => {
  const { app } = fixture();
  const cookie = await customerSession(app);
  const response = await request(app).post("/api/orders").set("Cookie", cookie).send({
    items: [{ productId: 1, quantity: 1 }], paymentMethod: "bank_transfer",
    customer: { name: "BJ Customer", email: "demo@bjelectronics.shop", phone: "01700000000", address: "House 18, Road 7", city: "Dhaka", postcode: "1209" },
  }).expect(201);
  assert.equal(response.body.order.paymentStatus, "awaiting_payment");
});

test("serves catalog, account, review, coupon, and administrator workflows", async () => {
  const { app } = fixture();
  await request(app).get("/api/products").expect(200);
  await request(app).post("/api/coupons/validate").send({ code: "welcome20", subtotal: 200 }).expect(200);
  const cookie = await customerSession(app);
  await request(app).post("/api/account/addresses").set("Cookie", cookie).send({ label: "Home", recipientName: "BJ Customer", phone: "01700000000", addressLine: "House 18, Road 7", city: "Dhaka", postcode: "1209", isDefault: true }).expect(201);
  await request(app).post("/api/account/wishlist/1").set("Cookie", cookie).expect(201);
  await request(app).post("/api/products/1/reviews").set("Cookie", cookie).send({ rating: 5, title: "Excellent purchase", body: "Fast delivery and excellent product quality." }).expect(201);
  const adminCookie = await adminSession(app);
  await request(app).get("/api/admin/customers").set("Cookie", adminCookie).expect(200);
  await request(app).get("/api/admin/coupons").set("Cookie", adminCookie).expect(200);
});

test("returns structured validation and not-found responses", async () => {
  const { app } = fixture();
  await request(app).post("/api/orders").send({}).expect(401);
  await request(app).get("/api/does-not-exist").expect(404);
});
