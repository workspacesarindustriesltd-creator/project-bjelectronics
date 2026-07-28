import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";
import { config } from "./config.js";

const users = [
  { name: "BJ Customer", email: "demo@bjelectronics.shop", phone: "01700000000", password: "demo12345", role: "customer" },
  { ...config.adminSeed, role: "admin" },
];

for (const user of users) {
  const hash = await bcrypt.hash(user.password, 12);
  await pool.execute(
    `INSERT INTO users (id, name, email, phone, password_hash, role)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), password_hash = VALUES(password_hash), role = VALUES(role)`,
    [crypto.randomUUID(), user.name, user.email, user.phone, hash, user.role],
  );
}

console.log("Seeded demo customer and administrator accounts.");
await pool.end();
