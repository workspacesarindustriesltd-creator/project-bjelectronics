function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Could not apply administrator media transform: ${label}.`);
  return source.replace(search, replacement);
}

export function transformAdminMediaSource(source) {
  let code = source;

  code = replaceRequired(
    code,
    'import { importedCatalog } from "./data/caravan-catalog.js";\n',
    'import { importedCatalog } from "./data/caravan-catalog.js";\nimport { MediaManager } from "./admin/MediaManager.jsx";\n',
    "media manager import",
  );

  code = replaceRequired(
    code,
    "  Gear,\n  List,",
    "  Gear,\n  ImageSquare,\n  List,",
    "media icon import",
  );

  code = replaceRequired(
    code,
    '  ["products", ShoppingCart, "Products"],\n  ["inventory", Cube, "Inventory"],',
    '  ["products", ShoppingCart, "Products"],\n  ["media", ImageSquare, "Media"],\n  ["inventory", Cube, "Inventory"],',
    "media navigation item",
  );

  code = replaceRequired(code, "navItems.slice(0, 6)", "navItems.slice(0, 7)", "workspace navigation slice");
  code = replaceRequired(code, "navItems.slice(6)", "navItems.slice(7)", "system navigation slice");

  code = replaceRequired(
    code,
    '  const titles = { overview: "Overview", orders: "Orders", products: "Products", inventory: "Inventory", customers: "Customers", promotions: "Promotions", settings: "Settings" };',
    '  const titles = { overview: "Overview", orders: "Orders", products: "Products", media: "Media", inventory: "Inventory", customers: "Customers", promotions: "Promotions", settings: "Settings" };',
    "media title",
  );

  code = replaceRequired(
    code,
    '    if (active === "products") return <ProductsView products={products} setProducts={setProducts} />;\n    if (active === "inventory")',
    '    if (active === "products") return <ProductsView products={products} setProducts={setProducts} />;\n    if (active === "media") return <MediaManager adminRequest={adminRequest} />;\n    if (active === "inventory")',
    "media workspace view",
  );

  code = code
    .replaceAll("https://www.bjelectronics.shop", "https://bjelectronics.shop")
    .replaceAll("https://admin.bjelectronics.shop", "https://bjelectronics.shop/admin")
    .replaceAll("HTTP-only, SameSite Strict, 8-hour expiry", "HTTP-only, SameSite Strict, 2-hour expiry");

  if (!code.includes("MediaManager") || !code.includes('media: "Media"')) {
    throw new Error("Administrator media integration was not included in the production source.");
  }

  return code;
}

export function adminMediaPlugin() {
  return {
    name: "bj-admin-media-integration",
    enforce: "pre",
    transform(code, id) {
      if (!/[\\/]src[\\/]AdminApp\.jsx$/.test(id)) return null;
      return { code: transformAdminMediaSource(code), map: null };
    },
  };
}
