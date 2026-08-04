import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";
import { config } from "./config.js";

const requireValue = (name, value) => {
  if (!value?.trim()) throw new Error(`${name} is required before running npm run db:seed-users.`);
  return value.trim();
};

const admin = {
  name: requireValue("ADMIN_NAME", config.adminSeed.name),
  email: requireValue("ADMIN_EMAIL", config.adminSeed.email).toLowerCase(),
  phone: config.adminSeed.phone?.trim() || null,
  password: requireValue("ADMIN_PASSWORD", config.adminSeed.password),
  role: "admin",
};

if (!admin.email.includes("@")) throw new Error("ADMIN_EMAIL must be a valid email address.");
if (admin.password.length < 12) throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
if (["admin12345", "password1234", "replace-with-a-long-unique-password"].includes(admin.password.toLowerCase())) {
  throw new Error("ADMIN_PASSWORD is a known placeholder and must be replaced.");
}

const users = [admin];
if (process.env.SEED_DEMO_USER === "true") {
  users.unshift({
    name: "BJ Customer",
    email: "demo@bjelectronics.shop",
    phone: "01700000000",
    password: "demo12345",
    role: "customer",
  });
}

for (const user of users) {
  const hash = await bcrypt.hash(user.password, 12);
  await pool.execute(
    `INSERT INTO users (id, name, email, phone, password_hash, role)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone), password_hash = VALUES(password_hash), role = VALUES(role)`,
    [crypto.randomUUID(), user.name, user.email.toLowerCase(), user.phone, hash, user.role],
  );
}

console.log(`Seeded ${users.length} configured user account${users.length === 1 ? "" : "s"}.`);
await pool.end();
