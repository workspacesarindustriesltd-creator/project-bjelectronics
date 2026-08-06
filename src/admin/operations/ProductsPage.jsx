import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Cube,
  Eye,
  EyeSlash,
  ImageSquare,
  Package,
  PencilSimple,
  Plus,
  TrendDown,
} from "@phosphor-icons/react";
import {
  Button,
  Card,
  DataTable,
  Field,
  FileDropzone,
  IconButton,
  PageHeader,
  Pagination,
  SearchField,
  Select,
  Tabs,
} from "../ui/index.jsx";
import { money } from "../../shared/client.js";
import {
  DetailList,
  Drawer,
  MetricCard,
  SortSelect,
  StatusBadge,
  Toolbar,
  humanize,
} from "./components.jsx";

const PAGE_SIZE = 10;
const EMPTY_PRODUCT = {
  sku: "",
  name: "",
  category: "",
  subcategory: "",
  brand: "",
  description: "",
  price: "",
  oldPrice: "",
  currency: "BDT",
  stock: "0",
  availability: "in_stock",
  image: "",
  sourceName: "",
  sourceUrl: "",
  active: true,
  featured: false,
};

function optimizedCloudinaryUrl(url) {
  if (!url?.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto:good,c_limit,w_1600/");
}

function productMatchesTab(product, tab) {
  if (tab === "active") return product.active;
  if (tab === "low") return Number(product.stock) > 0 && Number(product.stock) < 20;
  if (tab === "out") return Number(product.stock) <= 0;
  if (tab === "hidden") return !product.active;
  return true;
}

function sortProducts(rows, sort) {
  return [...rows].sort((a, b) => {
    if (sort === "name-desc") return String(b.name).localeCompare(String(a.name));
    if (sort === "price-high") return Number(b.price || 0) - Number(a.price || 0);
    if (sort === "price-low") return Number(a.price || 0) - Number(b.price || 0);
    if (sort === "stock-high") return Number(b.stock || 0) - Number(a.stock || 0);
    if (sort === "stock-low") return Number(a.stock || 0) - Number(b.stock || 0);
    return String(a.name).localeCompare(String(b.name));
  });
}

async function uploadImage(request, file) {
  const signature = await request("/api/admin/media/signature?resourceType=image");
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", signature.apiKey);
  body.append("signature", signature.signature);
  Object.entries(signature.parameters).forEach(([key, value]) => body.append(key, String(value)));
  const response = await fetch(signature.uploadUrl, { method: "POST", body });
  const result = await response.json();
  if (!response.ok) throw new Error(result?.error?.message || "Image upload failed.");
  return {
    image: optimizedCloudinaryUrl(result.secure_url),
    sourceName: "Cloudinary",
    sourceUrl: result.secure_url,
  };
}

function ProductEditor({ product, request, onSave, onClose }) {
  const [draft, setDraft] = useState(() => product ? {
    ...product,
    price: String(product.price ?? ""),
    oldPrice: product.oldPrice ? String(product.oldPrice) : "",
    stock: String(product.stock ?? 0),
  } : EMPTY_PRODUCT);
  const [files, setFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(product ? {
      ...product,
      price: String(product.price ?? ""),
      oldPrice: product.oldPrice ? String(product.oldPrice) : "",
      stock: String(product.stock ?? 0),
    } : EMPTY_PRODUCT);
    setFiles([]);
    setError("");
  }, [product]);

  useEffect(() => {
    const file = files[0];
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    if (!file.type.startsWith("image/")) {
      setFiles([]);
      setError("Choose a supported image file.");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [files]);

  const submit = async (event) => {
    event.preventDefault();
    if (!draft.image && files.length === 0) {
      setError("Add an image URL or upload an image from your device.");
      return;
    }
    if (files[0] && !files[0].type.startsWith("image/")) {
      setError("Choose a supported image file.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const media = files[0] ? await uploadImage(request, files[0]) : {};
      await onSave(product?.id, {
        ...draft,
        ...media,
        price: Number(draft.price),
        oldPrice: draft.oldPrice ? Number(draft.oldPrice) : null,
        stock: Number(draft.stock),
        subcategory: draft.subcategory || null,
        brand: draft.brand || null,
        sourceName: media.sourceName || draft.sourceName || null,
        sourceUrl: media.sourceUrl || draft.sourceUrl || null,
      });
      onClose();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  };

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const preview = previewUrl || draft.image;

  return (
    <form className="ops2-form" onSubmit={submit}>
      {error && <div className="ops2-form-error" role="alert">{error}</div>}
      <section className="ops2-form-section">
        <header><div><span>Product identity</span><h3>Core information</h3></div></header>
        <div className="ops2-form-grid">
          <Field label="SKU" required><input required value={draft.sku} onChange={(event) => update("sku", event.target.value)} /></Field>
          <Field label="Product name" required><input required value={draft.name} onChange={(event) => update("name", event.target.value)} /></Field>
          <Field label="Category" required><input required value={draft.category} onChange={(event) => update("category", event.target.value)} /></Field>
          <Field label="Subcategory"><input value={draft.subcategory || ""} onChange={(event) => update("subcategory", event.target.value)} /></Field>
          <Field label="Brand"><input value={draft.brand || ""} onChange={(event) => update("brand", event.target.value)} /></Field>
          <Field label="Availability"><Select value={draft.availability} onChange={(event) => update("availability", event.target.value)}><option value="in_stock">In stock</option><option value="preorder">Preorder</option></Select></Field>
          <Field label="Price (BDT)" required><input required type="number" min="1" value={draft.price} onChange={(event) => update("price", event.target.value)} /></Field>
          <Field label="Previous price"><input type="number" min="1" value={draft.oldPrice || ""} onChange={(event) => update("oldPrice", event.target.value)} /></Field>
          <Field label="Stock" required><input required type="number" min="0" value={draft.stock} onChange={(event) => update("stock", event.target.value)} /></Field>
        </div>
        <Field label="Description" required hint="Include specifications, warranty, condition and delivery information."><textarea required minLength="5" value={draft.description} onChange={(event) => update("description", event.target.value)} /></Field>
      </section>

      <section className="ops2-form-section">
        <header><div><span>Product media</span><h3>Image and attachment</h3></div></header>
        <div className="ops2-media-editor">
          <div className="ops2-image-preview">{preview ? <img src={preview} alt="Product preview" /> : <ImageSquare weight="duotone" />}</div>
          <div>
            <FileDropzone accept="image/*" maxSizeMb={10} value={files} onChange={setFiles} label="Upload product image" />
            <Field label="Or use image URL"><input type="url" value={draft.image || ""} onChange={(event) => update("image", event.target.value)} placeholder="https://..." /></Field>
          </div>
        </div>
      </section>

      <section className="ops2-form-section">
        <header><div><span>Store visibility</span><h3>Publishing controls</h3></div></header>
        <div className="ops2-check-grid">
          <label><input type="checkbox" checked={Boolean(draft.active)} onChange={(event) => update("active", event.target.checked)} /><span><strong>Visible in store</strong><small>Customers can browse and purchase this product.</small></span></label>
          <label><input type="checkbox" checked={Boolean(draft.featured)} onChange={(event) => update("featured", event.target.checked)} /><span><strong>Featured product</strong><small>Prioritize this item in promotional surfaces.</small></span></label>
        </div>
      </section>

      <div className="ops2-form-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy}>{product?.id ? "Save changes" : "Create product"}</Button></div>
    </form>
  );
}

export function ProductsPage({ products, onSaveProduct, request, inventoryOnly = false }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState(inventoryOnly ? "low" : "all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState(inventoryOnly ? "stock-low" : "name");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(undefined);
  const [viewing, setViewing] = useState(null);

  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(), [products]);
  const counts = useMemo(() => ({
    all: products.length,
    active: products.filter((product) => product.active).length,
    low: products.filter((product) => Number(product.stock) > 0 && Number(product.stock) < 20).length,
    out: products.filter((product) => Number(product.stock) <= 0).length,
    hidden: products.filter((product) => !product.active).length,
  }), [products]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sortProducts(products.filter((product) => {
      const matchesQuery = !normalized || `${product.name} ${product.sku} ${product.category} ${product.subcategory || ""} ${product.brand || ""}`.toLowerCase().includes(normalized);
      return matchesQuery && (category === "all" || product.category === category) && productMatchesTab(product, tab);
    }), sort);
  }, [category, products, query, sort, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const inventoryValue = products.reduce((sum, product) => sum + Number(product.stock || 0) * Number(product.price || 0), 0);
  useEffect(() => setPage(1), [category, query, sort, tab]);

  const columns = [
    {
      key: "product",
      label: "Product",
      render: (product) => <span className="ops2-product-cell"><span>{product.image ? <img src={product.image} alt="" /> : <Package />}</span><span><strong>{product.name}</strong><small>{product.sku} · {product.category}</small></span></span>,
    },
    { key: "price", label: "Price", render: (product) => <strong>{money(product.price, product.currency)}</strong> },
    {
      key: "stock",
      label: "Stock",
      render: (product) => <div className="ops2-stock-control"><IconButton label={`Decrease ${product.name} stock`} onClick={(event) => { event.stopPropagation(); onSaveProduct(product.id, { stock: Math.max(0, Number(product.stock) - 1) }); }}>−</IconButton><strong>{product.stock}</strong><IconButton label={`Increase ${product.name} stock`} onClick={(event) => { event.stopPropagation(); onSaveProduct(product.id, { stock: Number(product.stock) + 1 }); }}>+</IconButton></div>,
    },
    { key: "availability", label: "Availability", render: (product) => <StatusBadge value={Number(product.stock) <= 0 ? "out_of_stock" : product.availability} /> },
    { key: "active", label: "Visibility", render: (product) => <StatusBadge value={product.active ? "active" : "hidden"} /> },
    {
      key: "actions",
      label: "Actions",
      width: 108,
      render: (product) => <div className="ops2-row-actions"><IconButton label={`View ${product.name}`} onClick={(event) => { event.stopPropagation(); setViewing(product); }}><Eye /></IconButton><IconButton label={`Edit ${product.name}`} onClick={(event) => { event.stopPropagation(); setEditing(product); }}><PencilSimple /></IconButton></div>,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={inventoryOnly ? "Inventory control" : "Catalog workspace"}
        title={inventoryOnly ? "Inventory" : "Products"}
        description={inventoryOnly ? "Prioritize low-stock and unavailable items, adjust quantities, and verify catalog availability." : "Create, organize, publish, sort and maintain the complete product catalog."}
        actions={!inventoryOnly && <Button onClick={() => setEditing(null)}><Plus /> Add product</Button>}
      />

      <section className="ops2-metrics" aria-label="Product metrics">
        <MetricCard label="Catalog products" value={counts.all} detail={`${counts.active} currently visible`} icon={<Cube />} />
        <MetricCard label="Inventory value" value={money(inventoryValue)} detail="Current selling-price value" icon={<Archive />} tone="info" />
        <MetricCard label="Low stock" value={counts.low} detail="Fewer than 20 units" icon={<TrendDown />} tone="warning" />
        <MetricCard label="Out of stock" value={counts.out} detail="Needs replenishment" icon={<EyeSlash />} tone="danger" />
      </section>

      <Card className="ops2-work-card" padding="none">
        <div className="ops2-tabs-wrap">
          <Tabs value={tab} onChange={setTab} label="Product views" items={[
            { value: "all", label: "All", count: counts.all },
            { value: "active", label: "Active", count: counts.active },
            { value: "low", label: "Low stock", count: counts.low },
            { value: "out", label: "Out of stock", count: counts.out },
            { value: "hidden", label: "Hidden", count: counts.hidden },
          ]} />
        </div>
        <Toolbar>
          <SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, SKU, category or brand" label="Search products" />
          <Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</Select>
          <SortSelect value={sort} onChange={(event) => setSort(event.target.value)} options={[
            { value: "name", label: "Name A–Z" },
            { value: "name-desc", label: "Name Z–A" },
            { value: "price-high", label: "Highest price" },
            { value: "price-low", label: "Lowest price" },
            { value: "stock-high", label: "Highest stock" },
            { value: "stock-low", label: "Lowest stock" },
          ]} />
          <span className="ops2-result-count">{filtered.length} results</span>
        </Toolbar>
        <DataTable columns={columns} rows={visible} caption={inventoryOnly ? "Inventory product list" : "Product catalog list"} onRowClick={setViewing} />
        <div className="ops2-card-footer"><span>Showing {visible.length} of {filtered.length}</span><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>
      </Card>

      <Drawer open={editing !== undefined} title={editing?.id ? "Edit product" : "Add product"} description="Catalog information, media and publishing controls" onClose={() => setEditing(undefined)} size="lg">
        {editing !== undefined && <ProductEditor product={editing} request={request} onSave={onSaveProduct} onClose={() => setEditing(undefined)} />}
      </Drawer>

      <Drawer open={Boolean(viewing)} title={viewing?.name || "Product details"} description={viewing?.sku} onClose={() => setViewing(null)} footer={<><Button variant="secondary" onClick={() => setViewing(null)}>Close</Button><Button onClick={() => { setEditing(viewing); setViewing(null); }}><PencilSimple /> Edit product</Button></>}>
        {viewing && <div className="ops2-detail-stack"><div className="ops2-product-hero">{viewing.image ? <img src={viewing.image} alt={viewing.name} /> : <Package />}<div><StatusBadge value={viewing.active ? "active" : "hidden"} /><h3>{viewing.name}</h3><p>{viewing.description}</p></div></div><DetailList items={[
          { label: "SKU", value: viewing.sku },
          { label: "Category", value: viewing.category },
          { label: "Subcategory", value: viewing.subcategory },
          { label: "Brand", value: viewing.brand },
          { label: "Price", value: money(viewing.price, viewing.currency) },
          { label: "Stock", value: `${viewing.stock} units` },
          { label: "Availability", value: humanize(viewing.availability) },
          { label: "Featured", value: viewing.featured ? "Yes" : "No" },
        ]} /></div>}
      </Drawer>
    </>
  );
}
