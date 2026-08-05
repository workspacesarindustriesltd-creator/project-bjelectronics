import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowsClockwise, CheckCircle, CloudArrowUp, Database, DownloadSimple,
  FileArrowUp, Funnel, MagnifyingGlass, Package, SpinnerGap, SquaresFour,
  Storefront, UploadSimple, Warning, X,
} from "@phosphor-icons/react";
import { apiRequest, money, readStorage } from "../shared/client.js";
import "./catalog-operations.css";

const CSV_ALIASES = {
  old_price: "oldPrice",
  image_url: "image",
  imageurl: "image",
  source_name: "sourceName",
  source_url: "sourceUrl",
};

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      value = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function convertCsvValue(key, rawValue) {
  const value = rawValue.trim();
  if (["price", "oldPrice", "stock"].includes(key)) return value === "" ? null : Number(value);
  if (["active", "featured"].includes(key)) return ["true", "1", "yes", "active"].includes(value.toLowerCase());
  return value === "" ? null : value;
}

function parseCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error("CSV must include a header row and at least one product row.");
  const headers = rows[0].map((header) => {
    const normalised = header.trim().replace(/^\uFEFF/, "").replace(/[\s-]+/g, "_").toLowerCase();
    return CSV_ALIASES[normalised] || normalised.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
  });
  return rows.slice(1).map((cells) => Object.fromEntries(
    headers.map((header, index) => [header, convertCsvValue(header, cells[index] || "")]),
  ));
}

function parseCatalogText(text, fileName = "catalog") {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Choose a JSON or CSV file, or paste catalog data first.");
  if (fileName.toLowerCase().endsWith(".csv") || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return parseCsv(trimmed);
  }
  let payload;
  try {
    payload = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`JSON parsing failed: ${error.message}`);
  }
  const products = Array.isArray(payload) ? payload : payload?.products;
  if (!Array.isArray(products)) throw new Error('JSON must be an array or an object containing a "products" array.');
  return products;
}

function downloadCsv(products) {
  const headers = ["sku", "name", "category", "subcategory", "brand", "description", "price", "oldPrice", "currency", "stock", "availability", "image", "sourceName", "sourceUrl", "active", "featured"];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...products.map((product) => headers.map((header) => escape(product[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bj-electronics-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Notice({ notice, onClose }) {
  if (!notice) return null;
  return <div className={`cat-notice ${notice.tone}`} role="status" aria-live="polite">
    {notice.tone === "error" ? <Warning weight="fill" /> : <CheckCircle weight="fill" />}
    <span>{notice.message}</span>
    <button type="button" aria-label="Dismiss notification" onClick={onClose}><X /></button>
  </div>;
}

function Metric({ label, value, detail, icon: Icon }) {
  return <article className="cat-metric"><span><Icon weight="duotone" />{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

export function CatalogOperations({ onNavigate }) {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [summary, setSummary] = useState({ totals: {}, categories: [], brands: [] });
  const [products, setProducts] = useState([]);
  const [integrations, setIntegrations] = useState({ redis: { status: "checking" }, cloudinary: { status: "checking" } });
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState("activate");
  const [bulkValue, setBulkValue] = useState("0");
  const [catalogText, setCatalogText] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedProducts, setParsedProducts] = useState([]);
  const [preview, setPreview] = useState(null);
  const [notice, setNotice] = useState(null);
  const theme = readStorage("bj:admin-theme", "light");

  useEffect(() => {
    document.documentElement.dataset.adminTheme = theme;
  }, [theme]);

  const showNotice = useCallback((message, tone = "success") => setNotice({ message, tone }), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await apiRequest("/api/admin/auth/me");
      const [summaryResponse, productResponse, integrationResponse] = await Promise.all([
        apiRequest("/api/admin/catalog/summary"),
        apiRequest("/api/admin/products"),
        apiRequest("/api/admin/integrations"),
      ]);
      setSummary(summaryResponse);
      setProducts(productResponse.products || []);
      setIntegrations(integrationResponse);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        onNavigate("/admin/login");
        return;
      }
      showNotice(error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [onNavigate, showNotice]);

  useEffect(() => { load(); }, [load]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesQuery = `${product.name} ${product.sku} ${product.category} ${product.brand || ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesStock = stockFilter === "all"
      || (stockFilter === "out" && product.stock === 0)
      || (stockFilter === "low" && product.stock > 0 && product.stock < 10)
      || (stockFilter === "healthy" && product.stock >= 10);
    return matchesQuery && matchesStock;
  }), [products, query, stockFilter]);

  const allVisibleSelected = visibleProducts.length > 0 && visibleProducts.every((product) => selected.includes(product.id));

  const handleFile = async (file) => {
    if (!file) return;
    setPreview(null);
    setParsedProducts([]);
    setFileName(file.name);
    const text = await file.text();
    setCatalogText(text);
    showNotice(`${file.name} loaded. Run validation before importing.`);
  };

  const validateImport = async () => {
    setBusy("preview");
    try {
      const parsed = parseCatalogText(catalogText, fileName);
      setParsedProducts(parsed);
      const response = await apiRequest("/api/admin/catalog/preview", { method: "POST", body: { products: parsed } });
      setPreview(response);
      showNotice(response.invalid ? `Validation found ${response.invalid} invalid record(s).` : `${response.valid} products are ready to import.`, response.invalid ? "error" : "success");
    } catch (error) {
      setPreview(null);
      showNotice(error.message, "error");
    } finally {
      setBusy("");
    }
  };

  const commitImport = async () => {
    if (!preview || preview.invalid || !parsedProducts.length) return;
    setBusy("import");
    try {
      const response = await apiRequest("/api/admin/catalog/import", { method: "POST", body: { products: parsedProducts } });
      showNotice(`Catalog imported: ${response.created} created and ${response.updated} updated.`);
      setPreview(null);
      setParsedProducts([]);
      setCatalogText("");
      setFileName("");
      await load();
      setTab("overview");
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setBusy("");
    }
  };

  const applyBulkAction = async () => {
    if (!selected.length) {
      showNotice("Select at least one product.", "error");
      return;
    }
    setBusy("bulk");
    try {
      const body = { ids: selected, action: bulkAction };
      if (["set_stock", "adjust_stock"].includes(bulkAction)) body.value = Number(bulkValue);
      const response = await apiRequest("/api/admin/catalog/bulk", { method: "PATCH", body });
      showNotice(`${response.updated} product(s) updated.`);
      setSelected([]);
      await load();
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setBusy("");
    }
  };

  const purgeCache = async () => {
    setBusy("cache");
    try {
      await apiRequest("/api/admin/catalog/cache/purge", { method: "POST" });
      showNotice("Catalog cache purged. The next storefront request will rebuild it.");
      await load();
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setBusy("");
    }
  };

  if (loading) return <main className="cat-loading" role="status"><SpinnerGap className="spin" /><strong>Loading catalog operations</strong></main>;

  const totals = summary.totals || {};
  return <div className="cat-app">
    <aside className="cat-sidebar">
      <a className="cat-brand" href="/admin/dashboard" onClick={(event) => { event.preventDefault(); onNavigate("/admin/dashboard"); }}>
        <img src="/assets/bj-logo.png" alt="BJ Electronics" />
        <span><strong>BJ Admin</strong><small>Catalog operations</small></span>
      </a>
      <nav aria-label="Catalog operations">
        <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}><SquaresFour />Overview</button>
        <button className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}><FileArrowUp />Import catalog</button>
        <button className={tab === "bulk" ? "active" : ""} onClick={() => setTab("bulk")}><Package />Bulk inventory</button>
      </nav>
      <button className="cat-back" onClick={() => onNavigate("/admin/dashboard")}><ArrowLeft />Back to dashboard</button>
    </aside>

    <main className="cat-main">
      <header className="cat-topbar">
        <div><span>Administrator workspace</span><h1>Catalog operations</h1></div>
        <div className="cat-top-actions">
          <button onClick={load} disabled={Boolean(busy)}><ArrowsClockwise className={busy ? "spin" : ""} />Refresh</button>
          <a href="/" target="_blank" rel="noreferrer"><Storefront />Storefront</a>
        </div>
      </header>

      <Notice notice={notice} onClose={() => setNotice(null)} />

      <section className="cat-content">
        {tab === "overview" && <>
          <div className="cat-page-head"><div><span>Catalog intelligence</span><h2>Inventory and publishing overview</h2><p>Monitor product health, catalog value, discounts, categories and service readiness.</p></div><button className="cat-primary" onClick={() => setTab("import")}><UploadSimple />Import products</button></div>
          <div className="cat-metrics">
            <Metric icon={Package} label="Products" value={totals.totalProducts || 0} detail={`${totals.activeProducts || 0} active · ${totals.hiddenProducts || 0} hidden`} />
            <Metric icon={Database} label="Inventory units" value={Number(totals.totalUnits || 0).toLocaleString("en-BD")} detail={`${totals.lowStock || 0} low · ${totals.outOfStock || 0} out of stock`} />
            <Metric icon={SquaresFour} label="Inventory value" value={money(totals.inventoryValue || 0)} detail={`${totals.featuredProducts || 0} featured products`} />
            <Metric icon={Funnel} label="Average discount" value={`${Number(totals.averageDiscount || 0).toFixed(1)}%`} detail={`${summary.categories?.length || 0} active category groups`} />
          </div>

          <div className="cat-overview-grid">
            <section className="cat-card cat-category-card"><header><div><span>Merchandising</span><h3>Category distribution</h3></div><SquaresFour /></header><div className="cat-category-list">{summary.categories?.map((category) => <article key={category.category}><div><strong>{category.category}</strong><small>{category.stockUnits} units · {money(category.inventoryValue)}</small></div><b>{category.productCount}</b></article>)}</div></section>
            <section className="cat-card"><header><div><span>Brands</span><h3>Catalog coverage</h3></div><Package /></header><div className="cat-brand-list">{summary.brands?.map((brand) => <span key={brand.brand}><strong>{brand.brand}</strong><b>{brand.productCount}</b></span>)}</div></section>
            <section className="cat-card"><header><div><span>Infrastructure</span><h3>Service controls</h3></div><Database /></header><div className="cat-services"><div><span><Database />Redis catalog cache</span><b className={integrations.redis?.status || "disabled"}>{integrations.redis?.status || "disabled"}</b></div><div><span><CloudArrowUp />Cloudinary media</span><b className={integrations.cloudinary?.status || "disabled"}>{integrations.cloudinary?.status || "disabled"}</b></div></div><button className="cat-secondary" onClick={purgeCache} disabled={busy === "cache" || integrations.redis?.status === "disabled"}>{busy === "cache" ? <SpinnerGap className="spin" /> : <ArrowsClockwise />}Purge catalog cache</button></section>
          </div>
        </>}

        {tab === "import" && <>
          <div className="cat-page-head"><div><span>Safe data ingestion</span><h2>Import or update product catalog</h2><p>Validate JSON or CSV, preview SKU creates and updates, then commit the entire import atomically.</p></div></div>
          <div className="cat-import-grid">
            <section className="cat-card cat-import-source">
              <header><div><span>Step 1</span><h3>Choose catalog data</h3></div><FileArrowUp /></header>
              <label className="cat-dropzone"><input type="file" accept=".json,.csv,application/json,text/csv" onChange={(event) => handleFile(event.target.files?.[0])} /><UploadSimple weight="duotone" /><strong>{fileName || "Choose JSON or CSV"}</strong><small>Maximum 1,000 products per import. Existing SKUs are updated.</small></label>
              <label className="cat-textarea">Or paste JSON/CSV<textarea value={catalogText} onChange={(event) => { setCatalogText(event.target.value); setPreview(null); }} placeholder='{"products":[{"sku":"BJ-001", ...}]}' spellCheck="false" /></label>
              <button className="cat-primary" onClick={validateImport} disabled={busy === "preview" || !catalogText.trim()}>{busy === "preview" ? <SpinnerGap className="spin" /> : <CheckCircle />}Validate and preview</button>
            </section>

            <section className="cat-card cat-import-preview">
              <header><div><span>Step 2</span><h3>Validation report</h3></div><CheckCircle /></header>
              {!preview && <div className="cat-empty"><FileArrowUp weight="duotone" /><strong>No validation report</strong><p>Load product data and run validation to inspect creates, updates and errors.</p></div>}
              {preview && <>
                <div className="cat-preview-metrics"><span><small>Valid</small><strong>{preview.valid}</strong></span><span><small>Creates</small><strong>{preview.creates}</strong></span><span><small>Updates</small><strong>{preview.updates}</strong></span><span className={preview.invalid ? "error" : ""}><small>Invalid</small><strong>{preview.invalid}</strong></span></div>
                {preview.errors?.length > 0 && <div className="cat-errors"><strong>Fix these records before importing</strong>{preview.errors.map((error) => <div key={`${error.index}-${error.sku || "record"}`}><b>Row {error.index + 1}{error.sku ? ` · ${error.sku}` : ""}</b><span>{error.message}</span></div>)}</div>}
                {preview.preview?.length > 0 && <div className="cat-preview-table"><div className="cat-preview-row head"><span>SKU</span><span>Product</span><span>Category</span><span>Stock</span><span>Operation</span></div>{preview.preview.map((product) => <div className="cat-preview-row" key={product.sku}><strong>{product.sku}</strong><span>{product.name}</span><span>{product.category}</span><b>{product.stock}</b><i className={product.operation}>{product.operation}</i></div>)}</div>}
                <button className="cat-primary" onClick={commitImport} disabled={busy === "import" || preview.invalid > 0}>{busy === "import" ? <SpinnerGap className="spin" /> : <UploadSimple />}Import {preview.valid} products</button>
              </>}
            </section>
          </div>
        </>}

        {tab === "bulk" && <>
          <div className="cat-page-head"><div><span>Bulk catalog control</span><h2>Inventory and visibility actions</h2><p>Select products, apply safe bulk changes, or export the complete catalog as CSV.</p></div><button className="cat-secondary" onClick={() => downloadCsv(products)}><DownloadSimple />Export CSV</button></div>
          <section className="cat-card cat-product-card">
            <div className="cat-toolbar">
              <label><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search SKU, product, category or brand" /></label>
              <select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}><option value="all">All inventory</option><option value="low">Low stock</option><option value="out">Out of stock</option><option value="healthy">Healthy stock</option></select>
              <span>{visibleProducts.length} products</span>
            </div>
            <div className="cat-bulkbar">
              <strong>{selected.length} selected</strong>
              <select value={bulkAction} onChange={(event) => setBulkAction(event.target.value)}><option value="activate">Publish</option><option value="hide">Hide</option><option value="feature">Feature</option><option value="unfeature">Remove featured</option><option value="set_stock">Set stock</option><option value="adjust_stock">Adjust stock</option></select>
              {["set_stock", "adjust_stock"].includes(bulkAction) && <input type="number" value={bulkValue} onChange={(event) => setBulkValue(event.target.value)} aria-label="Bulk stock value" />}
              <button className="cat-primary" onClick={applyBulkAction} disabled={busy === "bulk" || !selected.length}>{busy === "bulk" ? <SpinnerGap className="spin" /> : <CheckCircle />}Apply action</button>
            </div>
            <div className="cat-product-table">
              <div className="cat-product-row head"><label><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelected(allVisibleSelected ? selected.filter((id) => !visibleProducts.some((product) => product.id === id)) : [...new Set([...selected, ...visibleProducts.map((product) => product.id)])])} /><span>Product</span></label><span>Category</span><span>Price</span><span>Stock</span><span>State</span></div>
              {visibleProducts.map((product) => <div className="cat-product-row" key={product.id}><label><input type="checkbox" checked={selected.includes(product.id)} onChange={() => setSelected((items) => items.includes(product.id) ? items.filter((id) => id !== product.id) : [...items, product.id])} /><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{product.sku} · {product.brand || "Unbranded"}</small></span></label><span>{product.category}</span><strong>{money(product.price, product.currency)}</strong><b className={product.stock === 0 ? "out" : product.stock < 10 ? "low" : ""}>{product.stock}</b><div><i className={product.active ? "active" : "hidden"}>{product.active ? "Active" : "Hidden"}</i>{product.featured && <i className="featured">Featured</i>}</div></div>)}
              {!visibleProducts.length && <div className="cat-empty"><Package weight="duotone" /><strong>No matching products</strong><p>Change the search term or inventory filter.</p></div>}
            </div>
          </section>
        </>}
      </section>
    </main>
  </div>;
}
