#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { config } from "../server/config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const connection = await mysql.createConnection({
  ...config.database,
  multipleStatements: true,
});

try {
  const schema = await readFile(path.join(root, "database", "schema.sql"), "utf8");
  await connection.query(schema);
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  const migrationDir = path.join(root, "database", "migrations");
  const files = (await readdir(migrationDir)).filter((name) => name.endsWith(".sql")).sort();
  for (const name of files) {
    const [rows] = await connection.execute("SELECT 1 FROM schema_migrations WHERE name = ?", [name]);
    if (rows.length) continue;
    const sql = await readFile(path.join(migrationDir, name), "utf8");
    await connection.beginTransaction();
    try {
      await connection.query(sql);
      await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [name]);
      await connection.commit();
      console.log(`Applied migration: ${name}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
} finally {
  await connection.end();
}
