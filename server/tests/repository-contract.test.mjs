
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("order placement locks inventory and uses guarded stock deductions", async () => {
  const source = await readFile(new URL("../repository.js", import.meta.url), "utf8");
  assert.match(source, /SELECT \* FROM products WHERE id IN \([^)]*\) FOR UPDATE/);
  assert.match(source, /UPDATE products SET stock = stock - \? WHERE id = \? AND stock >= \?/);
  assert.match(source, /stock changed during checkout/);
});

test("database and server contain no online gateway implementation", async () => {
  const files = [
    new URL("../repository.js", import.meta.url),
    new URL("../config.js", import.meta.url),
    new URL("../../database/schema.sql", import.meta.url),
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const forbidden = [
      ["ssl", "commerz"].join(""),
      ["payment", "provider"].join("_"),
      ["CREATE TABLE IF NOT EXISTS", "payments"].join(" "),
    ];
    for (const value of forbidden) {
      assert.equal(source.toLowerCase().includes(value.toLowerCase()), false);
    }
  }
});
