import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../app.js";

const passwordHash = await bcrypt.hash("demo12345", 4);

function fixture() {
  const users = [{
    id: "customer-1",
    name: "BJ Customer",
    email: "demo@bjelectronics.shop",
    phone: "01700000000",
    password_hash: passwordHash,
    role: "customer",
  }, {
    id: "admin-1",
    name: "Store Administrator",
    email: "admin@bjelectronics.shop",
    phone: "01700000001",
    password_hash: passwordHash,
    role: "admin",
  }];
  const addresses = [];
  const wishlist = [];
  const reviews = [{
    id: "review-1", productId: 1, userId: "customer-1", name: "BJ Customer",
    rating: 5, title: "Excellent purchase", body: "Fast delivery and excellent product quality.",
    verifiedPurchase: true, createdAt: "2026-07-20T10:00:00Z",
  }];
  const products = [{
    id: 1, sku: "BJ-LAP-M2", name: "MacBook Air M2", category: "Laptops",
    description: "Premium laptop", price: 1199.99, currency: "USD", stock: 8,
    image: "/assets/laptop.webp", active: true, featured: true,
  }];
  const repository = {
    findUserByEmail: async (email) => users.find((user) => user.email === email) || null,
    findUserById: async (id) => users.find((user) => user.id === id) || null,
    createUser: async ({ name, email, phone, passwordHash: hash }) => {
      const user = { id: `user-${users.length + 1}`, name, email, phone, password_hash: hash, role: "customer" };
      users.push(user);
      return { id: user.id, name, email, phone, role: user.role };
    },
    listProducts: async () => products,
    listOrdersForUser: async () => [],
    getOrderForUser: async () => null,
    listAddresses: async () => addresses,
    createAddress: async (userId, data) => {
      const address = { id: `address-${addresses.length + 1}`, userId, ...data };
      addresses.push(address);
      return address;
    },
    updateAddress: async () => null,
    deleteAddress: async () => false,
    listWishlist: async () => wishlist.map((id) => products.find((product) => product.id === id)),
    addWishlistItem: async (_userId, productId) => {
      wishlist.push(productId);
      return true;
    },
    removeWishlistItem: async (_userId, productId) => {
      const index = wishlist.indexOf(productId);
      if (index >= 0) wishlist.splice(index, 1);
    },
    listProductReviews: async (productId) => reviews.filter((review) => review.productId === productId),
    createProductReview: async (productId, userId, data) => {
      const user = users.find((item) => item.id === userId);
      const existing = reviews.find((review) => review.productId === productId && review.userId === userId);
      if (existing) {
        Object.assign(existing, data);
        return existing;
      }
      const review = { id: `review-${reviews.length + 1}`, productId, userId, name: user.name, ...data, verifiedPurchase: false, createdAt: new Date().toISOString() };
      reviews.push(review);
      return review;
    },
    validateCoupon: async (code, subtotal) => code === "WELCOME20" && subtotal >= 100
      ? { id: 1, code, discountType: "percent", discountValue: 20, minimumOrder: 100, active: true }
      : null,
    listCustomers: async () => users.filter((user) => user.role === "customer"),
    listCoupons: async () => [],
    createPendingOrder: async ({ userId, customer, currency }) => ({
      id: "order-1", orderNumber: "BJ-TEST", userId, customer, currency,
      subtotal: 1199.99, shipping: 0, tax: 96, total: 1295.99,
      lines: [{ product: products[0], quantity: 1 }],
    }),
    attachPaymentSession: async () => "payment-1",
  };
  const paymentGateway = {
    settings: { isLive: false },
    initiate: async () => ({
      transactionId: "BJTEST123",
      sessionKey: "session-1",
      gatewayUrl: "https://sandbox.sslcommerz.com/testbox",
    }),
  };
  return { app: createApp({ repository, paymentGateway }), users };
}

test("reports API health", async () => {
  const { app } = fixture();
  const response = await request(app).get("/api/health").expect(200);
  assert.equal(response.body.status, "ok");
});

test("registers a customer and creates an HTTP-only session", async () => {
  const { app, users } = fixture();
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name: "New Customer", email: "new@example.com", phone: "01711111111", password: "strongpass1" })
    .expect(201);
  assert.equal(response.body.user.email, "new@example.com");
  assert.match(response.headers["set-cookie"][0], /bj_session=/);
  assert.equal(users.length, 3);
});

test("logs in and returns protected order history", async () => {
  const { app } = fixture();
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "demo@bjelectronics.shop", password: "demo12345" })
    .expect(200);
  const cookie = login.headers["set-cookie"];
  const orders = await request(app).get("/api/orders").set("Cookie", cookie).expect(200);
  assert.deepEqual(orders.body.orders, []);
});

test("serves the catalog and keeps customer sessions separate from admin APIs", async () => {
  const { app } = fixture();
  const catalog = await request(app).get("/api/products").expect(200);
  assert.equal(catalog.body.products[0].sku, "BJ-LAP-M2");
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "demo@bjelectronics.shop", password: "demo12345" })
    .expect(200);
  await request(app).get("/api/admin/products").set("Cookie", login.headers["set-cookie"]).expect(401);
});

test("keeps customer and administrator credential entry points separate", async () => {
  const { app } = fixture();
  const storefrontAttempt = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@bjelectronics.shop", password: "demo12345" })
    .expect(403);
  assert.match(storefrontAttempt.body.error, /protected BJ Admin portal/);

  const adminAttempt = await request(app)
    .post("/api/admin/auth/login")
    .send({ email: "demo@bjelectronics.shop", password: "demo12345" })
    .expect(401);
  assert.match(adminAttempt.body.error, /Administrator email or password/);
});

test("creates a sandbox SSLCOMMERZ checkout session for an authenticated customer", async () => {
  const { app } = fixture();
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "demo@bjelectronics.shop", password: "demo12345" })
    .expect(200);
  const response = await request(app)
    .post("/api/payments/sslcommerz/initiate")
    .set("Cookie", login.headers["set-cookie"])
    .send({
      items: [{ productId: 1, quantity: 1 }],
      currency: "USD",
      customer: {
        name: "BJ Customer", email: "demo@bjelectronics.shop", phone: "01700000000",
        address: "Karwan Bazar", city: "Dhaka", state: "Dhaka", postcode: "1215", country: "Bangladesh",
      },
    })
    .expect(201);
  assert.equal(response.body.sandbox, true);
  assert.equal(response.body.paymentUrl, "https://sandbox.sslcommerz.com/testbox");
});

test("manages customer addresses and wishlist items", async () => {
  const { app } = fixture();
  const login = await request(app).post("/api/auth/login")
    .send({ email: "demo@bjelectronics.shop", password: "demo12345" }).expect(200);
  const cookie = login.headers["set-cookie"];
  const address = await request(app).post("/api/account/addresses").set("Cookie", cookie).send({
    label: "Home", recipientName: "BJ Customer", phone: "01700000000",
    addressLine: "House 18, Road 7", city: "Dhaka", postcode: "1209", isDefault: true,
  }).expect(201);
  assert.equal(address.body.address.label, "Home");
  await request(app).post("/api/account/wishlist/1").set("Cookie", cookie).expect(201);
  const wishlist = await request(app).get("/api/account/wishlist").set("Cookie", cookie).expect(200);
  assert.equal(wishlist.body.products[0].name, "MacBook Air M2");
});

test("lists product reviews publicly and accepts authenticated customer reviews", async () => {
  const { app } = fixture();
  const listed = await request(app).get("/api/products/1/reviews").expect(200);
  assert.equal(listed.body.reviews[0].rating, 5);

  const login = await request(app).post("/api/auth/login")
    .send({ email: "demo@bjelectronics.shop", password: "demo12345" }).expect(200);
  const created = await request(app).post("/api/products/1/reviews")
    .set("Cookie", login.headers["set-cookie"])
    .send({ rating: 4, title: "Updated review", body: "A reliable product with clear warranty support." })
    .expect(201);
  assert.equal(created.body.review.title, "Updated review");
  await request(app).post("/api/products/1/reviews")
    .send({ rating: 5, title: "Guest review", body: "This request should not be accepted." })
    .expect(401);
});

test("validates coupons and exposes the admin customer directory", async () => {
  const { app } = fixture();
  const coupon = await request(app).post("/api/coupons/validate")
    .send({ code: "welcome20", subtotal: 200 }).expect(200);
  assert.equal(coupon.body.coupon.discountValue, 20);
  const login = await request(app).post("/api/admin/auth/login")
    .send({ email: "admin@bjelectronics.shop", password: "demo12345" }).expect(200);
  assert.match(login.headers["set-cookie"][0], /bj_admin_session=/);
  assert.match(login.headers["set-cookie"][0], /SameSite=Strict/);
  const customers = await request(app).get("/api/admin/customers")
    .set("Cookie", login.headers["set-cookie"]).expect(200);
  assert.equal(customers.body.customers[0].role, "customer");
});
