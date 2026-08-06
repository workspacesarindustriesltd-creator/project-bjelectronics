import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = {
  platform: "src/admin/AdminPlatform.jsx",
  console: "src/admin/operations/OperationsConsole.jsx",
  orders: "src/admin/operations/OrdersPage.jsx",
  products: "src/admin/operations/ProductsPage.jsx",
  customers: "src/admin/operations/CustomersPage.jsx",
  components: "src/admin/operations/components.jsx",
  css: "src/admin/operations/operations.css",
};

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("administrator operations routes use the modular console", async () => {
  const platform = await source(files.platform);
  const consoleSource = await source(files.console);
  assert.match(platform, /isOperationsPath/);
  assert.match(platform, /<OperationsConsole/);
  for (const route of ["orders", "products", "inventory", "customers"]) {
    assert.match(consoleSource, new RegExp(`admin/${route}`));
  }
  assert.match(platform, /admin:navigation/);
});

test("operations pages expose reusable table, filter and detail workflows", async () => {
  const [orders, products, customers, components] = await Promise.all([
    source(files.orders),
    source(files.products),
    source(files.customers),
    source(files.components),
  ]);
  for (const page of [orders, products, customers]) {
    assert.match(page, /DataTable/);
    assert.match(page, /Pagination/);
    assert.match(page, /SearchField/);
    assert.match(page, /Drawer/);
  }
  assert.match(orders, /BulkBar/);
  assert.match(orders, /Apply status/);
  assert.match(products, /FileDropzone/);
  assert.match(products, /media\/signature\?resourceType=image/);
  assert.match(customers, /Avatar/);
  assert.match(components, /aria-modal="true"/);
});

test("operations source contains no embedded production credentials", async () => {
  const content = (await Promise.all(Object.values(files).map(source))).join("\n");
  assert.doesNotMatch(content, /admin12345|sk-proj-|CLOUDINARY_API_SECRET\s*=|DATABASE_URL\s*=/i);
  assert.match(content, /prefers-reduced-motion/);
  assert.match(content, /role="dialog"/);
});
