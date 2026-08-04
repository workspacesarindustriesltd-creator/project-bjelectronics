import crypto from "node:crypto";
import { pool, withTransaction } from "./db.js";

const mapProduct = (row) => ({
  id: row.id,
  sku: row.sku,
  name: row.name,
  category: row.category,
  subcategory: row.subcategory,
  brand: row.brand,
  description: row.description,
  price: Number(row.price),
  oldPrice: row.old_price == null ? null : Number(row.old_price),
  currency: row.currency,
  stock: row.stock,
  availability: row.availability,
  image: row.image_url,
  sourceName: row.source_name,
  sourceUrl: row.source_url,
  active: Boolean(row.active),
  featured: Boolean(row.featured),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapOrder = (row) => ({
  id: row.id,
  orderNumber: row.order_number,
  status: row.status,
  paymentStatus: row.payment_status,
  paymentMethod: row.payment_method,
  total: Number(row.total_amount),
  currency: row.currency,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  shippingAddress: row.shipping_address,
  createdAt: row.created_at,
});

const mapAddress = (row) => ({
  id: row.id,
  label: row.label,
  recipientName: row.recipient_name,
  phone: row.phone,
  addressLine: row.address_line,
  city: row.city,
  postcode: row.postcode,
  isDefault: Boolean(row.is_default),
});

const mapCoupon = (row) => ({
  id: row.id,
  code: row.code,
  discountType: row.discount_type,
  discountValue: Number(row.discount_value),
  minimumOrder: Number(row.minimum_order),
  usageLimit: row.usage_limit,
  usedCount: row.used_count,
  startsAt: row.starts_at,
  expiresAt: row.expires_at,
  active: Boolean(row.active),
});

const mapReview = (row) => ({
  id: row.id,
  productId: row.product_id,
  userId: row.user_id,
  name: row.name,
  rating: row.rating,
  title: row.title,
  body: row.body,
  verifiedPurchase: Boolean(row.verified_purchase),
  createdAt: row.created_at,
});

export class MySqlRepository {
  async findUserByEmail(email) {
    const [rows] = await pool.execute(
      "SELECT id, name, email, phone, password_hash, role, created_at FROM users WHERE email = ? LIMIT 1",
      [email.toLowerCase()],
    );
    return rows[0] || null;
  }

  async findUserById(id) {
    const [rows] = await pool.execute(
      "SELECT id, name, email, phone, role, created_at FROM users WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] || null;
  }

  async createUser({ name, email, phone, passwordHash, role = "customer" }) {
    const id = crypto.randomUUID();
    await pool.execute(
      "INSERT INTO users (id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)",
      [id, name, email.toLowerCase(), phone || null, passwordHash, role],
    );
    return this.findUserById(id);
  }

  async listProducts({ includeInactive = false } = {}) {
    const [rows] = await pool.query(
      `SELECT * FROM products ${includeInactive ? "" : "WHERE active = 1"} ORDER BY featured DESC, created_at DESC`,
    );
    return rows.map(mapProduct);
  }

  async findProductsByIds(ids, connection = pool) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await connection.execute(`SELECT * FROM products WHERE id IN (${placeholders})`, ids);
    return rows.map(mapProduct);
  }

  async createProduct(data) {
    const [result] = await pool.execute(
      `INSERT INTO products
       (sku, name, category, subcategory, brand, description, price, old_price, currency, stock, availability, image_url, source_name, source_url, active, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.sku, data.name, data.category, data.subcategory || null, data.brand || null, data.description, data.price, data.oldPrice || null, data.currency || "BDT", data.stock, data.availability || "in_stock", data.image, data.sourceName || null, data.sourceUrl || null, data.active ?? 1, data.featured ?? 0],
    );
    const [rows] = await pool.execute("SELECT * FROM products WHERE id = ?", [result.insertId]);
    return mapProduct(rows[0]);
  }

  async updateProduct(id, data) {
    const fields = {
      sku: "sku", name: "name", category: "category", subcategory: "subcategory", brand: "brand", description: "description",
      price: "price", oldPrice: "old_price", currency: "currency", stock: "stock",
      availability: "availability", image: "image_url", sourceName: "source_name",
      sourceUrl: "source_url", active: "active", featured: "featured",
    };
    const updates = [];
    const values = [];
    for (const [key, column] of Object.entries(fields)) {
      if (data[key] !== undefined) {
        updates.push(`${column} = ?`);
        values.push(data[key]);
      }
    }
    if (!updates.length) throw new Error("No product fields supplied.");
    values.push(id);
    await pool.execute(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`, values);
    const [rows] = await pool.execute("SELECT * FROM products WHERE id = ?", [id]);
    return rows[0] ? mapProduct(rows[0]) : null;
  }

  async placeOrder({ userId, items, customer, currency = "BDT", paymentMethod = "cash_on_delivery" }) {
    return withTransaction(async (connection) => {
      const productIds = [...new Set(items.map((item) => Number(item.productId)))];
      const placeholders = productIds.map(() => "?").join(",");
      const [rows] = await connection.execute(
        `SELECT * FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
        productIds,
      );
      const products = rows.map(mapProduct);
      const productMap = new Map(products.map((product) => [product.id, product]));
      let subtotal = 0;
      const lines = items.map((item) => {
        const product = productMap.get(Number(item.productId));
        const quantity = Number(item.quantity);
        if (!product || !product.active) throw Object.assign(new Error("One or more products are unavailable."), { status: 409 });
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw Object.assign(new Error("Invalid product quantity."), { status: 400 });
        if (product.stock < quantity) throw Object.assign(new Error(`${product.name} does not have enough stock.`), { status: 409 });
        const lineTotal = Number((product.price * quantity).toFixed(2));
        subtotal += lineTotal;
        return { product, quantity, lineTotal };
      });

      const shipping = currency === "BDT" ? (subtotal >= 5000 ? 0 : 120) : (subtotal >= 50 ? 0 : 9.99);
      const tax = currency === "BDT" ? 0 : Number((subtotal * 0.08).toFixed(2));
      const total = Number((subtotal + shipping + tax).toFixed(2));
      const id = crypto.randomUUID();
      const orderNumber = `BJ-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
      const paymentStatus = paymentMethod === "bank_transfer" ? "awaiting_payment" : "pending";

      await connection.execute(
        `INSERT INTO orders
         (id, order_number, user_id, status, payment_status, payment_method, subtotal, shipping_amount, tax_amount, total_amount, currency, customer_name, customer_email, customer_phone, shipping_address)
         VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, orderNumber, userId, paymentStatus, paymentMethod, subtotal, shipping, tax, total, currency, customer.name, customer.email, customer.phone, customer.address],
      );

      for (const line of lines) {
        await connection.execute(
          `INSERT INTO order_items (order_id, product_id, product_name, sku, quantity, unit_price, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, line.product.id, line.product.name, line.product.sku, line.quantity, line.product.price, line.lineTotal],
        );
        const [stockUpdate] = await connection.execute(
          "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
          [line.quantity, line.product.id, line.quantity],
        );
        if (stockUpdate.affectedRows !== 1) throw Object.assign(new Error(`${line.product.name} stock changed during checkout.`), { status: 409 });
      }

      return {
        id, orderNumber, status: "confirmed", paymentStatus, paymentMethod,
        subtotal, shipping, tax, total, currency, customer, lines,
        createdAt: new Date().toISOString(),
      };
    });
  }

  async listOrdersForUser(userId) {
    const [rows] = await pool.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [userId]);
    return rows.map(mapOrder);
  }

  async getOrderForUser(id, userId) {
    const [rows] = await pool.execute(
      "SELECT * FROM orders WHERE (id = ? OR order_number = ?) AND user_id = ? LIMIT 1",
      [id, id, userId],
    );
    if (!rows[0]) return null;
    const [items] = await pool.execute("SELECT * FROM order_items WHERE order_id = ? ORDER BY id", [rows[0].id]);
    return {
      ...mapOrder(rows[0]),
      items: items.map((item) => ({
        id: item.id, productId: item.product_id, name: item.product_name, sku: item.sku,
        quantity: item.quantity, unitPrice: Number(item.unit_price), lineTotal: Number(item.line_total),
      })),
    };
  }

  async listAddresses(userId) {
    const [rows] = await pool.execute(
      "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC",
      [userId],
    );
    return rows.map(mapAddress);
  }

  async createAddress(userId, data) {
    const id = crypto.randomUUID();
    await withTransaction(async (connection) => {
      if (data.isDefault) await connection.execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId]);
      await connection.execute(
        `INSERT INTO addresses (id, user_id, label, recipient_name, phone, address_line, city, postcode, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, data.label, data.recipientName, data.phone, data.addressLine, data.city, data.postcode, data.isDefault],
      );
    });
    const [rows] = await pool.execute("SELECT * FROM addresses WHERE id = ?", [id]);
    return mapAddress(rows[0]);
  }

  async updateAddress(id, userId, data) {
    const fields = {
      label: "label", recipientName: "recipient_name", phone: "phone", addressLine: "address_line",
      city: "city", postcode: "postcode", isDefault: "is_default",
    };
    const updates = [];
    const values = [];
    for (const [key, column] of Object.entries(fields)) {
      if (data[key] !== undefined) {
        updates.push(`${column} = ?`);
        values.push(data[key]);
      }
    }
    if (!updates.length) throw new Error("No address fields supplied.");
    await withTransaction(async (connection) => {
      if (data.isDefault) await connection.execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", [userId]);
      values.push(id, userId);
      await connection.execute(`UPDATE addresses SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`, values);
    });
    const [rows] = await pool.execute("SELECT * FROM addresses WHERE id = ? AND user_id = ?", [id, userId]);
    return rows[0] ? mapAddress(rows[0]) : null;
  }

  async deleteAddress(id, userId) {
    const [result] = await pool.execute("DELETE FROM addresses WHERE id = ? AND user_id = ?", [id, userId]);
    return result.affectedRows > 0;
  }

  async listWishlist(userId) {
    const [rows] = await pool.execute(
      `SELECT p.* FROM wishlists w JOIN products p ON p.id = w.product_id
       WHERE w.user_id = ? AND p.active = 1 ORDER BY w.created_at DESC`,
      [userId],
    );
    return rows.map(mapProduct);
  }

  async addWishlistItem(userId, productId) {
    const [result] = await pool.execute(
      "INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)",
      [userId, productId],
    );
    return result.affectedRows > 0;
  }

  async removeWishlistItem(userId, productId) {
    await pool.execute("DELETE FROM wishlists WHERE user_id = ? AND product_id = ?", [userId, productId]);
  }

  async listProductReviews(productId) {
    const [rows] = await pool.execute(
      `SELECT r.*, u.name FROM product_reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT 100`,
      [productId],
    );
    return rows.map(mapReview);
  }

  async createProductReview(productId, userId, data) {
    const id = crypto.randomUUID();
    const [verifiedRows] = await pool.execute(
      `SELECT 1 FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = ? AND o.user_id = ? AND o.status IN ('processing', 'shipped', 'delivered')
       LIMIT 1`,
      [productId, userId],
    );
    await pool.execute(
      `INSERT INTO product_reviews (id, product_id, user_id, rating, title, body, verified_purchase)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), title = VALUES(title), body = VALUES(body),
       verified_purchase = VALUES(verified_purchase), updated_at = CURRENT_TIMESTAMP`,
      [id, productId, userId, data.rating, data.title, data.body, verifiedRows.length > 0],
    );
    const [rows] = await pool.execute(
      `SELECT r.*, u.name FROM product_reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ? AND r.user_id = ? LIMIT 1`,
      [productId, userId],
    );
    return mapReview(rows[0]);
  }

  async validateCoupon(code, subtotal) {
    const [rows] = await pool.execute(
      `SELECT * FROM coupons WHERE code = ? AND active = 1 AND minimum_order <= ?
       AND (starts_at IS NULL OR starts_at <= NOW()) AND (expires_at IS NULL OR expires_at > NOW())
       AND (usage_limit IS NULL OR used_count < usage_limit) LIMIT 1`,
      [code, subtotal],
    );
    return rows[0] ? mapCoupon(rows[0]) : null;
  }

  async listAllOrders() {
    const [rows] = await pool.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200");
    return rows.map(mapOrder);
  }

  async updateOrderStatus(id, status) {
    return withTransaction(async (connection) => {
      const [orders] = await connection.execute("SELECT * FROM orders WHERE id = ? FOR UPDATE", [id]);
      const current = orders[0];
      if (!current) return null;
      if (current.status === status) return mapOrder(current);

      const [items] = await connection.execute("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [id]);
      if (status === "cancelled" && current.status !== "cancelled") {
        for (const item of items) {
          await connection.execute("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
        }
      }
      if (current.status === "cancelled" && status !== "cancelled") {
        for (const item of items) {
          const [result] = await connection.execute(
            "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
            [item.quantity, item.product_id, item.quantity],
          );
          if (result.affectedRows !== 1) throw Object.assign(new Error("Order cannot be restored because inventory is unavailable."), { status: 409 });
        }
      }

      await connection.execute(
        "UPDATE orders SET status = ?, payment_status = CASE WHEN ? = 'cancelled' THEN 'cancelled' ELSE payment_status END WHERE id = ?",
        [status, status, id],
      );
      const [updated] = await connection.execute("SELECT * FROM orders WHERE id = ?", [id]);
      return mapOrder(updated[0]);
    });
  }

  async listCustomers() {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
       COUNT(o.id) AS order_count, COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total_amount ELSE 0 END), 0) AS lifetime_value
       FROM users u LEFT JOIN orders o ON o.user_id = u.id
       WHERE u.role = 'customer' GROUP BY u.id ORDER BY u.created_at DESC LIMIT 500`,
    );
    return rows.map((row) => ({
      id: row.id, name: row.name, email: row.email, phone: row.phone,
      createdAt: row.created_at, orderCount: Number(row.order_count), lifetimeValue: Number(row.lifetime_value),
    }));
  }

  async listCoupons() {
    const [rows] = await pool.query("SELECT * FROM coupons ORDER BY created_at DESC");
    return rows.map(mapCoupon);
  }

  async createCoupon(data) {
    const [result] = await pool.execute(
      `INSERT INTO coupons (code, discount_type, discount_value, minimum_order, usage_limit, starts_at, expires_at, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.code, data.discountType, data.discountValue, data.minimumOrder, data.usageLimit || null, data.startsAt || null, data.expiresAt || null, data.active],
    );
    const [rows] = await pool.execute("SELECT * FROM coupons WHERE id = ?", [result.insertId]);
    return mapCoupon(rows[0]);
  }

  async updateCoupon(id, data) {
    const fields = {
      code: "code", discountType: "discount_type", discountValue: "discount_value",
      minimumOrder: "minimum_order", usageLimit: "usage_limit", startsAt: "starts_at",
      expiresAt: "expires_at", active: "active",
    };
    const updates = [];
    const values = [];
    for (const [key, column] of Object.entries(fields)) {
      if (data[key] !== undefined) {
        updates.push(`${column} = ?`);
        values.push(data[key]);
      }
    }
    if (!updates.length) throw new Error("No coupon fields supplied.");
    values.push(id);
    await pool.execute(`UPDATE coupons SET ${updates.join(", ")} WHERE id = ?`, values);
    const [rows] = await pool.execute("SELECT * FROM coupons WHERE id = ?", [id]);
    return rows[0] ? mapCoupon(rows[0]) : null;
  }
}
