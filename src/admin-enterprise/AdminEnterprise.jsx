import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise, ArrowRight, Bell, CaretRight, ChartBar, ChartLineUp, CheckCircle,
  ClockCounterClockwise, CloudArrowUp, Cube, Database, DotsThree, DownloadSimple,
  Envelope, FileArrowUp, Gear, GithubLogo, Globe, GoogleLogo, IdentificationCard,
  ImageSquare, Key, List, LockKey, MagnifyingGlass, Moon, Package, PaintBrush,
  PencilSimple, Plug, Plus, Receipt, ShieldCheck, ShoppingCart, SignOut, SlidersHorizontal,
  Storefront, Sun, Tag, Truck, UserCircle, UserGear, UsersThree, Warning, Wrench, X,
} from "@phosphor-icons/react";
import { apiRequest, formatDate, money, readStorage, writeStorage } from "../shared/client.js";
import { MediaManager } from "../admin/MediaManager.jsx";
import { CatalogOperations } from "../admin/CatalogOperations.jsx";
import {
  Badge, Button, Card, CardContent, CardFooter, CardHeader, DataTable, Dialog, EmptyState,
  Field, IconButton, Input, LoadingScreen, Metric, PageHeader, PermissionGate, SearchInput,
  Select, Sheet, Switch, Tabs, Textarea, ToastProvider, useToast,
} from "./ui.jsx";
import "./admin-enterprise.css";
import "../admin-media.css";

const NAV_GROUPS = [
  { label: "Workspace", items: [
    ["dashboard", ChartLineUp, "Overview", "dashboard.read"],
    ["orders", Package, "Orders", "orders.read"],
    ["customers", UsersThree, "Customers", "customers.read"],
  ] },
  { label: "Commerce", items: [
    ["products", ShoppingCart, "Products", "catalog.read"],
    ["inventory", Cube, "Inventory", "catalog.read"],
    ["catalog", Database, "Catalog operations", "catalog.import"],
    ["promotions", Tag, "Promotions", "promotions.manage"],
  ] },
  { label: "Experience", items: [
    ["media", ImageSquare, "Media library", "media.manage"],
    ["customization", PaintBrush, "Store customization", "storefront.manage"],
  ] },
  { label: "Platform", items: [
    ["integrations", Plug, "Integrations", "integrations.manage"],
    ["administrators", UserGear, "Administrators & RBAC", "users.manage"],
    ["audit", ClockCounterClockwise, "Audit history", "audit.read"],
    ["system", Gear, "System settings", "settings.manage"],
  ] },
];

const TITLES = Object.fromEntries(NAV_GROUPS.flatMap((group) => group.items.map(([id,, label]) => [id, label])));
const ORDER_STATUSES = ["confirmed", "processing", "shipped", "delivered", "cancelled"];
const EMPTY_PRODUCT = { sku: "", name: "", category: "", subcategory: "", brand: "", description: "", price: "", oldPrice: "", currency: "BDT", stock: "0", availability: "in_stock", image: "", sourceName: "", sourceUrl: "", active: true, featured: false };
const EMPTY_COUPON = { code: "", discountType: "percent", discountValue: "10", minimumOrder: "0", usageLimit: "", startsAt: "", expiresAt: "", active: true };

function hasPermission(permissions, permission) {
  return permissions?.includes("*") || permissions?.includes(permission);
}

function statusVariant(status) {
  if (["ok", "connected", "active", "delivered", "in_stock", "configured"].includes(status)) return "success";
  if (["degraded", "low", "processing", "shipped", "confirmed", "awaiting_payment"].includes(status)) return "warning";
  if (["disabled", "hidden", "cancelled", "out_of_stock", "failed"].includes(status)) return "danger";
  return "secondary";
}

function StatusBadge({ status }) {
  return <Badge variant={statusVariant(String(status || "unknown").toLowerCase())}>{String(status || "unknown").replaceAll("_", " ")}</Badge>;
}

function initials(name = "Administrator") {
  return name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function OAuthButton({ provider, configured }) {
  const details = provider === "google"
    ? { label: "Continue with Google", Icon: GoogleLogo }
    : { label: "Continue with GitHub", Icon: GithubLogo };
  return <a
    className={`ui-button ui-button-secondary ui-button-default-size${configured ? "" : " disabled"}`}
    href={configured ? `/api/admin/auth/oauth/${provider}/start` : undefined}
    aria-disabled={!configured}
    onClick={(event) => { if (!configured) event.preventDefault(); }}
    title={configured ? details.label : `${provider} authentication is not configured`}
  ><details.Icon weight="bold" />{details.label}</a>;
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [providers, setProviders] = useState({ google: { configured: false }, github: { configured: false } });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => new URLSearchParams(location.search).get("oauthError") || "");

  useEffect(() => {
    apiRequest("/api/admin/auth/oauth/providers").then((response) => setProviders(response.providers || providers)).catch(() => undefined);
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest("/api/admin/auth/login", { method: "POST", body: form });
      onLogin(response.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return <main className="enterprise-login">
    <section className="enterprise-login-visual">
      <div className="enterprise-login-brand"><img src="/assets/bj-logo.png" alt="BJ Electronics" /><span><strong>BJ ELECTRONICS</strong><small>Enterprise administration</small></span></div>
      <div className="enterprise-login-copy"><span>Protected operations platform</span><h1>Control every store operation from one focused workspace.</h1><p>Catalog, fulfillment, customers, promotions, media, storefront design, integrations, administrators and audit history are secured behind role-based access.</p></div>
      <small>© 2026 BJ Electronics · Powered by SAR INDUSTRIES NETWORK</small>
    </section>
    <section className="enterprise-login-panel">
      <div className="enterprise-login-card">
        <span>Administrator access</span><h2>Sign in securely</h2><p>Use an assigned administrator email or a connected identity provider. OAuth accounts must match an existing verified administrator email.</p>
        <form onSubmit={submit}>
          <Field label="Email address" required><Input type="email" autoComplete="username" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
          <Field label="Password" required><Input type="password" minLength="8" autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></Field>
          {error && <div className="enterprise-form-error"><Warning weight="fill" /><span>{error}</span></div>}
          <Button size="lg" loading={busy}>Sign in with email <ArrowRight /></Button>
        </form>
        <div className="enterprise-login-divider">or use verified account</div>
        <div className="enterprise-oauth"><OAuthButton provider="google" configured={providers.google?.configured} /><OAuthButton provider="github" configured={providers.github?.configured} /></div>
      </div>
    </section>
  </main>;
}

function DashboardPage({ data, setView }) {
  const { products, orders, customers, integrations } = data;
  const revenue = orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + Number(order.total || 0), 0);
  const lowStock = products.filter((product) => Number(product.stock) < 10);
  const openOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
  const statusCounts = ORDER_STATUSES.slice(0, 4).map((status) => ({ status, count: orders.filter((order) => order.status === status).length }));
  const maximum = Math.max(1, ...statusCounts.map((item) => item.count));
  return <>
    <PageHeader eyebrow="Executive workspace" title="Store operations overview" description="Real-time operational signals from catalog, orders, customers and connected services." actions={<><Button variant="secondary" onClick={() => setView("catalog")}><FileArrowUp />Import catalog</Button><Button onClick={() => setView("products")}><Plus />Add product</Button></>} />
    <div className="ui-metrics">
      <Metric icon={ChartLineUp} label="Gross order value" value={money(revenue)} detail={`${openOrders.length} orders require attention`} tone="success" />
      <Metric icon={Package} label="Orders" value={orders.length.toLocaleString("en-BD")} detail={`${orders.filter((order) => order.status === "delivered").length} delivered`} />
      <Metric icon={Cube} label="Catalog products" value={products.length.toLocaleString("en-BD")} detail={`${lowStock.length} low-stock products`} tone={lowStock.length ? "warning" : "success"} />
      <Metric icon={UsersThree} label="Customers" value={customers.length.toLocaleString("en-BD")} detail="Registered customer accounts" />
    </div>
    <div className="enterprise-dashboard-grid">
      <Card><CardHeader eyebrow="Fulfillment" title="Order pipeline" description="Current distribution of active fulfillment states." icon={ChartBar} /><CardContent><div className="enterprise-chart">{statusCounts.map((item) => <div className="enterprise-chart-column" key={item.status}><div><i style={{ height: `${Math.max(5, (item.count / maximum) * 100)}%` }} /></div><strong>{item.count}</strong><small>{item.status}</small></div>)}</div></CardContent></Card>
      <Card><CardHeader eyebrow="Infrastructure" title="Connected services" description="Live runtime health checks." icon={Plug} action={<Button variant="ghost" size="sm" onClick={() => setView("integrations")}>Manage <CaretRight /></Button>} /><CardContent><div className="enterprise-kpi-list">{[
        [Database, "Redis catalog cache", integrations.redis?.status || "disabled"],
        [CloudArrowUp, "Cloudinary media", integrations.cloudinary?.status || "disabled"],
        [ShieldCheck, "Administrator RBAC", "active"],
      ].map(([Icon, label, status]) => <article key={label}><Icon /><div><strong>{label}</strong><small>Runtime service status</small></div><StatusBadge status={status} /></article>)}</div></CardContent></Card>
      <Card><CardHeader eyebrow="Recent activity" title="Latest orders" description="Newest customer orders and fulfillment state." icon={Receipt} action={<Button variant="ghost" size="sm" onClick={() => setView("orders")}>View all <CaretRight /></Button>} /><CardContent><div className="enterprise-kpi-list">{orders.slice(0, 7).map((order) => <article key={order.id}><Package /><div><strong>{order.orderNumber}</strong><small>{order.customerName} · {formatDate(order.createdAt)}</small></div><div><b>{money(order.total, order.currency)}</b><StatusBadge status={order.status} /></div></article>)}{!orders.length && <EmptyState icon={Package} title="No orders yet" description="New customer orders will appear here." />}</div></CardContent></Card>
      <Card><CardHeader eyebrow="Inventory" title="Stock attention" description="Products below the operational threshold." icon={Cube} action={<Button variant="ghost" size="sm" onClick={() => setView("inventory")}>Open inventory <CaretRight /></Button>} /><CardContent><div className="enterprise-kpi-list">{lowStock.slice(0, 7).map((product) => <article key={product.id}><img src={product.image} alt="" className="enterprise-avatar" /><div><strong>{product.name}</strong><small>{product.sku} · {product.category}</small></div><b className={product.stock === 0 ? "enterprise-stock out" : "enterprise-stock low"}>{product.stock}</b></article>)}{!lowStock.length && <EmptyState icon={CheckCircle} title="Inventory is healthy" description="No products are below the low-stock threshold." />}</div></CardContent></Card>
    </div>
  </>;
}

function OrdersPage({ orders, onStatusUpdate }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const visible = orders.filter((order) => (status === "all" || order.status === status) && `${order.orderNumber} ${order.customerName} ${order.customerPhone || ""}`.toLowerCase().includes(query.toLowerCase()));
  const update = async (nextStatus) => {
    setBusy(true);
    try { setSelected(await onStatusUpdate(selected.id, nextStatus)); } finally { setBusy(false); }
  };
  const columns = [
    { key: "order", label: "Order", render: (order) => <span><strong>{order.orderNumber}</strong><small>{order.paymentMethod?.replaceAll("_", " ")}</small></span> },
    { key: "customer", label: "Customer", render: (order) => <span><strong>{order.customerName}</strong><small>{order.customerPhone}</small></span> },
    { key: "date", label: "Created", render: (order) => formatDate(order.createdAt) },
    { key: "total", label: "Total", render: (order) => <strong>{money(order.total, order.currency)}</strong> },
    { key: "status", label: "Status", render: (order) => <StatusBadge status={order.status} /> },
    { key: "open", label: "", width: 46, render: () => <CaretRight /> },
  ];
  return <>
    <PageHeader eyebrow="Fulfillment operations" title="Orders" description="Search, review and update fulfillment states with automatic inventory restoration on cancellation." />
    <Card><div className="enterprise-toolbar"><div><SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search orders" /><Select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{ORDER_STATUSES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</Select></div><Badge>{visible.length} orders</Badge></div><DataTable columns={columns} rows={visible} onRowClick={setSelected} empty={<EmptyState icon={Package} title="No matching orders" description="Change the search term or status filter." />} /></Card>
    <Sheet open={Boolean(selected)} title={selected?.orderNumber || "Order details"} description="Customer, payment and fulfillment information." onClose={() => setSelected(null)}>
      {selected && <div className="enterprise-grid"><Card><CardContent><div className="enterprise-grid"><StatusBadge status={selected.status} /><dl className="enterprise-kpi-list"><article><UserCircle /><div><strong>{selected.customerName}</strong><small>{selected.customerPhone}</small></div></article><article><Receipt /><div><strong>{money(selected.total, selected.currency)}</strong><small>{selected.paymentMethod?.replaceAll("_", " ")}</small></div></article><article><Truck /><div><strong>Shipping address</strong><small>{selected.shippingAddress}</small></div></article></dl></CardContent></Card><Field label="Fulfillment status"><Select value={selected.status} disabled={busy} onChange={(event) => update(event.target.value)}>{ORDER_STATUSES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</Select></Field></div>}
    </Sheet>
  </>;
}

function ProductForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_PRODUCT);
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      await onSave({ ...form, price: Number(form.price), oldPrice: form.oldPrice ? Number(form.oldPrice) : null, stock: Number(form.stock), subcategory: form.subcategory || null, brand: form.brand || null, sourceName: form.sourceName || null, sourceUrl: form.sourceUrl || null });
      onClose();
    } finally { setBusy(false); }
  };
  return <form onSubmit={submit}><div className="ui-form-grid">
    <Field label="SKU" required><Input required value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></Field>
    <Field label="Product name" required><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
    <Field label="Category" required><Input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></Field>
    <Field label="Subcategory"><Input value={form.subcategory || ""} onChange={(event) => setForm({ ...form, subcategory: event.target.value })} /></Field>
    <Field label="Brand"><Input value={form.brand || ""} onChange={(event) => setForm({ ...form, brand: event.target.value })} /></Field>
    <Field label="Availability"><Select value={form.availability} onChange={(event) => setForm({ ...form, availability: event.target.value })}><option value="in_stock">In stock</option><option value="preorder">Preorder</option></Select></Field>
    <Field label="Price" required><Input required type="number" min="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
    <Field label="Old price"><Input type="number" min="1" value={form.oldPrice || ""} onChange={(event) => setForm({ ...form, oldPrice: event.target.value })} /></Field>
    <Field label="Stock" required><Input required type="number" min="0" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></Field>
    <Field label="Currency"><Select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}><option value="BDT">BDT</option><option value="USD">USD</option></Select></Field>
    <Field label="Image URL" required className="wide"><Input required value={form.image} onChange={(event) => setForm({ ...form, image: event.target.value })} /></Field>
    <Field label="Description" required className="wide"><Textarea required minLength="5" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
  </div><Switch label="Visible in storefront" checked={Boolean(form.active)} onCheckedChange={(active) => setForm({ ...form, active })} /><Switch label="Featured product" checked={Boolean(form.featured)} onCheckedChange={(featured) => setForm({ ...form, featured })} /><div className="ui-form-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy}>Save product</Button></div></form>;
}

function ProductsPage({ products, onSave, inventoryOnly = false, canWrite = false }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState(null);
  const categories = [...new Set(products.map((product) => product.category))].sort();
  const visible = products.filter((product) => `${product.name} ${product.sku} ${product.category} ${product.brand || ""}`.toLowerCase().includes(query.toLowerCase()))
    .filter((product) => category === "all" || product.category === category)
    .filter((product) => !inventoryOnly || Number(product.stock) < 20);
  const save = (product) => onSave(editing?.id, product);
  const columns = [
    { key: "product", label: "Product", render: (product) => <div className="enterprise-product-cell"><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{product.sku} · {product.brand || "Unbranded"}</small></span></div> },
    { key: "category", label: "Category", render: (product) => <span>{product.category}<small>{product.subcategory || "—"}</small></span> },
    { key: "price", label: "Price", render: (product) => <strong>{money(product.price, product.currency)}</strong> },
    { key: "stock", label: "Stock", render: (product) => <span className={`enterprise-stock ${product.stock === 0 ? "out" : product.stock < 10 ? "low" : ""}`}>{product.stock}</span> },
    { key: "state", label: "State", render: (product) => <div><StatusBadge status={product.active ? "active" : "hidden"} /> {product.featured && <Badge variant="info">featured</Badge>}</div> },
    { key: "edit", label: "", width: 52, render: (product) => canWrite ? <IconButton label={`Edit ${product.name}`} onClick={(event) => { event.stopPropagation(); setEditing({ ...product, price: String(product.price), oldPrice: product.oldPrice ? String(product.oldPrice) : "", stock: String(product.stock) }); }}><PencilSimple /></IconButton> : null },
  ];
  return <>
    <PageHeader eyebrow={inventoryOnly ? "Stock control" : "Catalog management"} title={inventoryOnly ? "Inventory" : "Products"} description={inventoryOnly ? "Review low-stock products and update quantities before they affect fulfillment." : "Create, edit, publish and merchandise the complete store catalog."} actions={!inventoryOnly && canWrite ? <Button onClick={() => setEditing({ ...EMPTY_PRODUCT })}><Plus />Add product</Button> : null} />
    <Card><div className="enterprise-toolbar"><div><SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" /><Select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</Select></div><div><Badge>{visible.length} products</Badge>{inventoryOnly && <Button variant="secondary" size="sm" onClick={() => location.assign("/admin/catalog")}>Bulk inventory <ArrowRight /></Button>}</div></div><DataTable columns={columns} rows={visible} empty={<EmptyState icon={Cube} title="No matching products" description="Change the search term or category filter." />} /></Card>
    <Dialog open={Boolean(editing)} title={editing?.id ? "Edit product" : "Add product"} description="Product data is validated on the server before it is published." size="lg" onClose={() => setEditing(null)}>{editing && <ProductForm initial={editing} onSave={save} onClose={() => setEditing(null)} />}</Dialog>
  </>;
}

function CustomersPage({ customers }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const visible = customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone || ""}`.toLowerCase().includes(query.toLowerCase()));
  const columns = [
    { key: "customer", label: "Customer", render: (customer) => <div className="enterprise-product-cell"><span className="enterprise-avatar">{initials(customer.name)}</span><span><strong>{customer.name}</strong><small>{customer.email}</small></span></div> },
    { key: "phone", label: "Phone", render: (customer) => customer.phone || "—" },
    { key: "orders", label: "Orders", render: (customer) => <strong>{customer.orderCount}</strong> },
    { key: "value", label: "Lifetime value", render: (customer) => <strong>{money(customer.lifetimeValue)}</strong> },
    { key: "joined", label: "Joined", render: (customer) => formatDate(customer.createdAt) },
    { key: "open", label: "", width: 46, render: () => <CaretRight /> },
  ];
  return <><PageHeader eyebrow="Customer relationships" title="Customers" description="Account activity, contact information, order history summary and lifetime value." /><Card><div className="enterprise-toolbar"><SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" /><Badge>{visible.length} accounts</Badge></div><DataTable columns={columns} rows={visible} onRowClick={setSelected} empty={<EmptyState icon={UsersThree} title="No matching customers" description="Change the search term." />} /></Card><Sheet open={Boolean(selected)} title="Customer profile" description="Account summary and contact information." onClose={() => setSelected(null)}>{selected && <div className="enterprise-grid"><div className="enterprise-avatar" style={{ width: 72, height: 72, fontSize: 20 }}>{initials(selected.name)}</div><h2>{selected.name}</h2><a href={`mailto:${selected.email}`}>{selected.email}</a>{selected.phone && <a href={`tel:${selected.phone}`}>{selected.phone}</a>}<div className="ui-metrics"><Metric label="Orders" value={selected.orderCount} icon={Package} /><Metric label="Lifetime value" value={money(selected.lifetimeValue)} icon={ChartLineUp} /></div></div>}</Sheet></>;
}

function CouponForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_COUPON);
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      await onSave({ ...form, discountValue: Number(form.discountValue), minimumOrder: Number(form.minimumOrder), usageLimit: form.usageLimit ? Number(form.usageLimit) : null, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null });
      onClose();
    } finally { setBusy(false); }
  };
  return <form onSubmit={submit}><div className="ui-form-grid"><Field label="Coupon code" required><Input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} /></Field><Field label="Discount type"><Select value={form.discountType} onChange={(event) => setForm({ ...form, discountType: event.target.value })}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></Select></Field><Field label="Discount value" required><Input required type="number" min="1" value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: event.target.value })} /></Field><Field label="Minimum order"><Input type="number" min="0" value={form.minimumOrder} onChange={(event) => setForm({ ...form, minimumOrder: event.target.value })} /></Field><Field label="Usage limit"><Input type="number" min="1" value={form.usageLimit || ""} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} /></Field><Field label="Starts"><Input type="datetime-local" value={form.startsAt ? String(form.startsAt).slice(0, 16) : ""} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></Field><Field label="Expires"><Input type="datetime-local" value={form.expiresAt ? String(form.expiresAt).slice(0, 16) : ""} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} /></Field></div><Switch label="Campaign active" checked={Boolean(form.active)} onCheckedChange={(active) => setForm({ ...form, active })} /><div className="ui-form-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy}>Save coupon</Button></div></form>;
}

function PromotionsPage({ coupons, onSave }) {
  const [editing, setEditing] = useState(null);
  return <><PageHeader eyebrow="Marketing operations" title="Promotions" description="Create percentage or fixed-value offers with validity windows, minimum orders and usage limits." actions={<Button onClick={() => setEditing({ ...EMPTY_COUPON })}><Plus />New coupon</Button>} /><div className="enterprise-role-grid">{coupons.map((coupon) => <Card className="enterprise-role-card" key={coupon.id}><header><div><h3>{coupon.code}</h3><Badge variant={coupon.active ? "success" : "danger"}>{coupon.active ? "active" : "paused"}</Badge></div><IconButton label={`Edit ${coupon.code}`} onClick={() => setEditing({ ...coupon, discountValue: String(coupon.discountValue), minimumOrder: String(coupon.minimumOrder), usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "" })}><PencilSimple /></IconButton></header><p>{coupon.discountType === "percent" ? `${coupon.discountValue}% discount` : `${money(coupon.discountValue)} discount`} on orders over {money(coupon.minimumOrder)}.</p><div><Badge>Used {coupon.usedCount}{coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}</Badge><Badge>{coupon.expiresAt ? `Ends ${formatDate(coupon.expiresAt)}` : "No expiry"}</Badge></div></Card>)}{!coupons.length && <Card><EmptyState icon={Tag} title="No promotional campaigns" description="Create the first coupon campaign." action={<Button onClick={() => setEditing({ ...EMPTY_COUPON })}>Create coupon</Button>} /></Card>}</div><Dialog open={Boolean(editing)} title={editing?.id ? "Edit coupon" : "Create coupon"} description="Campaign settings are validated before activation." onClose={() => setEditing(null)}>{editing && <CouponForm initial={editing} onSave={(data) => onSave(editing.id, data)} onClose={() => setEditing(null)} />}</Dialog></>;
}

const SETTING_TABS = [
  ["identity", IdentificationCard, "Identity"], ["appearance", PaintBrush, "Appearance"],
  ["commerce", ShoppingCart, "Commerce"], ["checkout", Receipt, "Checkout"],
  ["seo", Globe, "SEO"], ["notifications", Bell, "Notifications"],
];

function CustomizationPage({ settings, onSave }) {
  const [group, setGroup] = useState("identity");
  const [draft, setDraft] = useState(() => structuredClone(settings));
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft(structuredClone(settings)), [settings]);
  const update = (field, value) => setDraft((current) => ({ ...current, [group]: { ...(current[group] || {}), [field]: value } }));
  const save = async () => { setBusy(true); try { await onSave(group, draft[group]); } finally { setBusy(false); } };
  const current = draft[group] || {};
  return <><PageHeader eyebrow="Store experience" title="Store customization" description="Manage brand identity, theme tokens, commerce rules, checkout controls, SEO and notifications without editing source code." actions={<><Button variant="secondary" onClick={() => window.open("/", "_blank")}>Preview storefront <Storefront /></Button><Button loading={busy} onClick={save}>Publish changes</Button></>} /><div className="enterprise-settings-layout"><Card className="enterprise-settings-nav">{SETTING_TABS.map(([id, Icon, label]) => <button key={id} className={group === id ? "active" : ""} onClick={() => setGroup(id)}><Icon />{label}</button>)}</Card><div className="enterprise-grid">
    {group === "identity" && <Card><CardHeader eyebrow="Brand foundation" title="Store identity" description="Core brand and customer support information." icon={IdentificationCard} /><CardContent><div className="ui-form-grid"><Field label="Store name"><Input value={current.storeName || ""} onChange={(event) => update("storeName", event.target.value)} /></Field><Field label="Tagline"><Input value={current.tagline || ""} onChange={(event) => update("tagline", event.target.value)} /></Field><Field label="Support email"><Input type="email" value={current.supportEmail || ""} onChange={(event) => update("supportEmail", event.target.value)} /></Field><Field label="Support phone"><Input value={current.supportPhone || ""} onChange={(event) => update("supportPhone", event.target.value)} /></Field><Field label="Logo URL" className="wide"><Input value={current.logoUrl || ""} onChange={(event) => update("logoUrl", event.target.value)} /></Field></div></CardContent></Card>}
    {group === "appearance" && <><Card><CardHeader eyebrow="Design tokens" title="Appearance system" description="Live storefront colors, radius, density and announcement bar." icon={PaintBrush} /><CardContent><div className="ui-form-grid"><Field label="Primary color"><div className="enterprise-color-field"><input type="color" value={current.primary || "#0f172a"} onChange={(event) => update("primary", event.target.value)} /><Input value={current.primary || ""} onChange={(event) => update("primary", event.target.value)} /></div></Field><Field label="Accent color"><div className="enterprise-color-field"><input type="color" value={current.accent || "#2563eb"} onChange={(event) => update("accent", event.target.value)} /><Input value={current.accent || ""} onChange={(event) => update("accent", event.target.value)} /></div></Field><Field label="Corner radius"><Input type="number" min="0" max="32" value={current.radius ?? 14} onChange={(event) => update("radius", Number(event.target.value))} /></Field><Field label="Interface density"><Select value={current.density || "comfortable"} onChange={(event) => update("density", event.target.value)}><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></Select></Field><Field label="Announcement text" className="wide"><Input value={current.announcement || ""} onChange={(event) => update("announcement", event.target.value)} /></Field></div><Switch label="Show announcement bar" checked={Boolean(current.announcementEnabled)} onCheckedChange={(value) => update("announcementEnabled", value)} /></CardContent></Card><Card><CardHeader eyebrow="Live preview" title="Storefront token preview" icon={Storefront} /><CardContent><div className="enterprise-preview" style={{ "--preview-primary": current.primary, "--preview-accent": current.accent, "--preview-radius": `${current.radius || 0}px` }}><header><strong>{draft.identity?.storeName || "BJ ELECTRONICS"}</strong><span>Search · Account · Cart</span></header><main><div><h3>{draft.identity?.tagline || "Trusted electronics"}</h3><p>Preview how brand tokens will influence storefront surfaces.</p><button>Shop products</button></div></main></div></CardContent></Card></>}
    {group === "commerce" && <Card><CardHeader eyebrow="Commerce rules" title="Catalog and shipping" icon={ShoppingCart} /><CardContent><div className="ui-form-grid"><Field label="Currency"><Select value={current.currency || "BDT"} onChange={(event) => update("currency", event.target.value)}><option value="BDT">BDT</option><option value="USD">USD</option></Select></Field><Field label="Low-stock threshold"><Input type="number" min="0" value={current.lowStockThreshold ?? 10} onChange={(event) => update("lowStockThreshold", Number(event.target.value))} /></Field><Field label="Free shipping threshold"><Input type="number" min="0" value={current.freeShippingThreshold ?? 5000} onChange={(event) => update("freeShippingThreshold", Number(event.target.value))} /></Field><Field label="Standard shipping fee"><Input type="number" min="0" value={current.standardShippingFee ?? 120} onChange={(event) => update("standardShippingFee", Number(event.target.value))} /></Field><Field label="Inventory reservation minutes"><Input type="number" min="1" value={current.inventoryReservationMinutes ?? 15} onChange={(event) => update("inventoryReservationMinutes", Number(event.target.value))} /></Field></div></CardContent></Card>}
    {group === "checkout" && <Card><CardHeader eyebrow="Checkout controls" title="Payment and customer rules" icon={Receipt} /><CardContent><Switch label="Cash on delivery" description="Allow customers to pay when their order is delivered." checked={Boolean(current.cashOnDelivery)} onCheckedChange={(value) => update("cashOnDelivery", value)} /><Switch label="Bank transfer" description="Show offline bank transfer instructions." checked={Boolean(current.bankTransfer)} onCheckedChange={(value) => update("bankTransfer", value)} /><Switch label="Guest checkout" description="Permit checkout without a registered account." checked={Boolean(current.guestCheckout)} onCheckedChange={(value) => update("guestCheckout", value)} /><Switch label="Require phone number" checked={Boolean(current.requirePhone)} onCheckedChange={(value) => update("requirePhone", value)} /><Field label="Order number prefix"><Input value={current.orderPrefix || "BJ"} onChange={(event) => update("orderPrefix", event.target.value.toUpperCase())} /></Field></CardContent></Card>}
    {group === "seo" && <Card><CardHeader eyebrow="Search visibility" title="SEO defaults" icon={Globe} /><CardContent><div className="ui-form-grid"><Field label="Default title" className="wide"><Input value={current.title || ""} onChange={(event) => update("title", event.target.value)} /></Field><Field label="Meta description" className="wide"><Textarea value={current.description || ""} onChange={(event) => update("description", event.target.value)} /></Field></div><Switch label="Allow storefront indexing" checked={Boolean(current.indexStorefront)} onCheckedChange={(value) => update("indexStorefront", value)} /></CardContent></Card>}
    {group === "notifications" && <Card><CardHeader eyebrow="Operations alerts" title="Notification preferences" icon={Bell} /><CardContent><Switch label="Low-stock email" checked={Boolean(current.lowStockEmail)} onCheckedChange={(value) => update("lowStockEmail", value)} /><Switch label="New-order email" checked={Boolean(current.newOrderEmail)} onCheckedChange={(value) => update("newOrderEmail", value)} /><Switch label="Integration failure email" checked={Boolean(current.failedIntegrationEmail)} onCheckedChange={(value) => update("failedIntegrationEmail", value)} /></CardContent></Card>}
  </div></div></>;
}

function IntegrationDialog({ provider, descriptor, existing, onSave, onClose }) {
  const [publicConfig, setPublicConfig] = useState(existing?.publicConfig || {});
  const [secrets, setSecrets] = useState({});
  const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault(); setBusy(true);
    try { await onSave(provider, { publicConfig, secrets }); onClose(); } finally { setBusy(false); }
  };
  return <form onSubmit={save}><div className="ui-form-grid">{descriptor.publicFields.map((field) => <Field key={field} label={field.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase())}><Input value={publicConfig[field] ?? ""} onChange={(event) => setPublicConfig({ ...publicConfig, [field]: ["port", "catalogTtlSeconds", "requestTimeoutMs"].includes(field) ? Number(event.target.value) : field === "secure" || field === "sandbox" ? event.target.value === "true" : event.target.value })} /></Field>)}{descriptor.secretFields.map((field) => <Field key={field} label={field.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase())} hint={existing?.secretsConfigured ? "Leave blank to keep the current encrypted value." : "Stored encrypted in the administrator vault."}><Input type="password" autoComplete="new-password" value={secrets[field] || ""} onChange={(event) => setSecrets({ ...secrets, [field]: event.target.value })} /></Field>)}</div><div className="enterprise-secret-note"><LockKey weight="fill" /> Secret values are encrypted server-side and never returned to the browser. Runtime-capable connectors refresh without a rebuild.</div><div className="ui-form-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy}>Save configuration</Button></div></form>;
}

function IntegrationsPage({ integrations, providerCatalog, onConfigure, onTest, onDisconnect }) {
  const [editing, setEditing] = useState(null);
  const map = Object.fromEntries(integrations.map((item) => [item.provider, item]));
  return <><PageHeader eyebrow="Connection center" title="Integrations" description="Configure encrypted runtime connections, test provider access, discover account metadata and activate supported services without editing source files." actions={<Button variant="secondary" onClick={() => location.reload()}><ArrowClockwise />Refresh</Button>} /><div className="enterprise-integrations">{Object.entries(providerCatalog).map(([provider, descriptor]) => {
    const integration = map[provider];
    const Icon = descriptor.category === "Authentication" ? Key : descriptor.category === "Infrastructure" ? Database : descriptor.category === "Media" ? CloudArrowUp : descriptor.category === "Payments" ? Receipt : descriptor.category === "Delivery" ? Truck : descriptor.category === "Development" ? GithubLogo : Plug;
    return <Card className="enterprise-integration-card" key={provider}><CardContent><div className="enterprise-integration-head"><span className="enterprise-integration-logo"><Icon weight="duotone" /></span><div><strong>{descriptor.name}</strong><small>{descriptor.category}</small></div><StatusBadge status={integration?.status || "disabled"} /></div><p>{descriptor.description}</p><div className="enterprise-integration-meta"><span><b>Secrets</b><strong>{integration?.secretsConfigured ? "Encrypted" : "Not configured"}</strong></span><span><b>Runtime activation</b><strong>{descriptor.runtime ? "Supported" : "Workflow required"}</strong></span><span><b>Last tested</b><strong>{integration?.lastTestedAt ? formatDate(integration.lastTestedAt) : "Never"}</strong></span></div>{integration?.lastError && <div className="enterprise-form-error"><Warning />{integration.lastError}</div>}<div className="enterprise-integration-actions"><Button size="sm" onClick={() => setEditing({ provider, descriptor, existing: integration })}>{integration ? "Configure" : "Connect"}</Button>{integration && <Button size="sm" variant="secondary" onClick={() => onTest(provider)}>Test connection</Button>}{integration && <Button size="sm" variant="ghost" onClick={() => onDisconnect(provider)}>Disconnect</Button>}</div></CardContent></Card>;
  })}</div><Dialog open={Boolean(editing)} title={editing?.descriptor?.name || "Configure integration"} description={editing?.descriptor?.description} size="lg" onClose={() => setEditing(null)}>{editing && <IntegrationDialog {...editing} onSave={onConfigure} onClose={() => setEditing(null)} />}</Dialog></>;
}

function RoleEditor({ role, permissions, onSave, onClose }) {
  const [form, setForm] = useState(role || { code: "", name: "", description: "", permissions: [] });
  const [busy, setBusy] = useState(false);
  const groups = Object.groupBy ? Object.groupBy(permissions, (permission) => permission.group) : permissions.reduce((result, permission) => ({ ...result, [permission.group]: [...(result[permission.group] || []), permission] }), {});
  const toggle = (code) => setForm((current) => ({ ...current, permissions: current.permissions.includes(code) ? current.permissions.filter((item) => item !== code) : [...current.permissions, code] }));
  const submit = async (event) => { event.preventDefault(); setBusy(true); try { await onSave(form); onClose(); } finally { setBusy(false); } };
  return <form onSubmit={submit}><div className="ui-form-grid"><Field label="Role code" required><Input required pattern="[a-z][a-z0-9_]{2,63}" disabled={role?.isSystem} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} /></Field><Field label="Role name" required><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Description" className="wide"><Textarea value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></div>{form.code === "super_admin" ? <div className="enterprise-secret-note">Super administrators automatically receive every current and future permission.</div> : <div className="enterprise-grid enterprise-grid-2" style={{ marginTop: 16 }}>{Object.entries(groups).map(([group, items]) => <div className="enterprise-permission-group" key={group}><strong>{group}</strong>{items.map((permission) => <label key={permission.code}><input type="checkbox" checked={form.permissions.includes(permission.code)} onChange={() => toggle(permission.code)} />{permission.name}</label>)}</div>)}</div>}<div className="ui-form-actions"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy}>Save role</Button></div></form>;
}

function AdministratorsPage({ users, roles, permissions, onRoleSave, onUserRoles }) {
  const [editingRole, setEditingRole] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [busy, setBusy] = useState(false);
  const openUser = (user) => { setEditingUser(user); setSelectedRoles(user.roles || []); };
  const saveUser = async () => { setBusy(true); try { await onUserRoles(editingUser.id, selectedRoles); setEditingUser(null); } finally { setBusy(false); } };
  const columns = [
    { key: "admin", label: "Administrator", render: (user) => <div className="enterprise-product-cell"><span className="enterprise-avatar">{initials(user.name)}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div> },
    { key: "roles", label: "Roles", render: (user) => <div>{user.roles.map((role) => <Badge key={role} variant="info">{role.replaceAll("_", " ")}</Badge>)}</div> },
    { key: "joined", label: "Joined", render: (user) => formatDate(user.createdAt) },
    { key: "manage", label: "", render: (user) => <Button size="sm" variant="secondary" onClick={() => openUser(user)}>Manage roles</Button> },
  ];
  return <><PageHeader eyebrow="Role-based access control" title="Administrators & RBAC" description="Assign least-privilege roles, create permission sets and review every privileged administrator account." actions={<Button onClick={() => setEditingRole({ code: "", name: "", description: "", permissions: [] })}><Plus />Create role</Button>} /><div className="enterprise-role-grid">{roles.map((role) => <Card className="enterprise-role-card" key={role.code}><header><div><h3>{role.name}</h3>{role.isSystem && <Badge>system</Badge>}</div><IconButton label={`Edit ${role.name}`} onClick={() => setEditingRole(role)}><PencilSimple /></IconButton></header><p>{role.description}</p><div>{role.permissions.includes("*") ? <Badge variant="success">All permissions</Badge> : role.permissions.slice(0, 6).map((permission) => <Badge key={permission}>{permission}</Badge>)}{role.permissions.length > 6 && <Badge>+{role.permissions.length - 6}</Badge>}</div></Card>)}</div><Card style={{ marginTop: 16 }}><CardHeader eyebrow="Team access" title="Administrator accounts" icon={UsersThree} /><DataTable columns={columns} rows={users} empty={<EmptyState icon={UserGear} title="No administrator accounts" description="Seed or promote an administrator account first." />} /></Card><Dialog open={Boolean(editingRole)} title={editingRole?.code ? "Edit role" : "Create role"} description="Changes take effect on the next authorized API request." size="xl" onClose={() => setEditingRole(null)}>{editingRole && <RoleEditor role={editingRole} permissions={permissions} onSave={onRoleSave} onClose={() => setEditingRole(null)} />}</Dialog><Dialog open={Boolean(editingUser)} title={`Roles for ${editingUser?.name || "administrator"}`} description="Assign one or more roles. Permissions are combined across assigned roles." onClose={() => setEditingUser(null)}>{editingUser && <div><div className="enterprise-grid">{roles.map((role) => <Switch key={role.code} label={role.name} description={role.description} checked={selectedRoles.includes(role.code)} onCheckedChange={(checked) => setSelectedRoles((current) => checked ? [...new Set([...current, role.code])] : current.filter((item) => item !== role.code))} />)}</div><div className="ui-form-actions"><Button variant="secondary" onClick={() => setEditingUser(null)}>Cancel</Button><Button loading={busy} disabled={!selectedRoles.length} onClick={saveUser}>Apply roles</Button></div></div>}</Dialog></>;
}

function AuditPage({ logs, onRefresh }) {
  const [query, setQuery] = useState("");
  const visible = logs.filter((log) => `${log.action} ${log.entityType} ${log.entityId || ""} ${log.actor?.email || "system"}`.toLowerCase().includes(query.toLowerCase()));
  const columns = [
    { key: "event", label: "Event", render: (log) => <div className="enterprise-audit-event"><span className="enterprise-audit-icon"><ClockCounterClockwise /></span><span><strong>{log.action.replaceAll(".", " ")}</strong><small>{log.entityType}{log.entityId ? ` · ${log.entityId}` : ""}</small></span></div> },
    { key: "actor", label: "Actor", render: (log) => <span><strong>{log.actor?.name || "System"}</strong><small>{log.actor?.email || log.ipAddress || "Automated"}</small></span> },
    { key: "metadata", label: "Details", render: (log) => <small>{Object.keys(log.metadata || {}).slice(0, 4).map((key) => `${key}: ${String(log.metadata[key]).slice(0, 30)}`).join(" · ") || "—"}</small> },
    { key: "date", label: "Date", render: (log) => formatDate(log.createdAt, { timeStyle: "short" }) },
  ];
  return <><PageHeader eyebrow="Security observability" title="Audit history" description="Immutable operational events for authentication, RBAC, settings, integrations, catalog and fulfillment changes." actions={<Button variant="secondary" onClick={onRefresh}><ArrowClockwise />Refresh</Button>} /><Card><div className="enterprise-toolbar"><SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search audit events" /><Badge>{visible.length} events</Badge></div><DataTable columns={columns} rows={visible} empty={<EmptyState icon={ClockCounterClockwise} title="No audit events" description="Privileged actions will appear here." />} /></Card></>;
}

function SystemPage({ environment, health }) {
  const configured = environment.filter((item) => item.configured).length;
  return <><PageHeader eyebrow="Platform controls" title="System settings" description="Deployment health, protected environment-variable status and application boundaries. Secret values are never displayed or returned." actions={<Button variant="secondary" onClick={() => window.open("/api/health", "_blank")}>Open health endpoint <ArrowRight /></Button>} /><div className="ui-metrics"><Metric icon={ShieldCheck} label="Environment variables" value={`${configured}/${environment.length}`} detail="Configured in Hostinger runtime" /><Metric icon={Database} label="Database" value={health?.dependencies?.database?.status || "unknown"} detail="MySQL application connection" tone="success" /><Metric icon={Database} label="Redis" value={health?.dependencies?.redis?.status || "disabled"} detail="Runtime cache connector" tone={health?.dependencies?.redis?.status === "ok" ? "success" : "warning"} /><Metric icon={CloudArrowUp} label="Cloudinary" value={health?.dependencies?.cloudinary?.status || "disabled"} detail="Signed media service" tone={health?.dependencies?.cloudinary?.status === "configured" ? "success" : "warning"} /></div><div className="enterprise-grid enterprise-grid-2"><Card><CardHeader eyebrow="Protected configuration" title="Environment status" description="Boot-critical values remain controlled by Hostinger. Runtime integration credentials are managed in the encrypted Integration Hub." icon={LockKey} /><CardContent><div className="enterprise-environment-list">{environment.map((variable) => <div className="enterprise-environment-row" key={variable.name}><code>{variable.name}</code><span>{variable.group}</span><StatusBadge status={variable.configured ? "configured" : "disabled"} /></div>)}</div></CardContent></Card><div className="enterprise-grid"><Card><CardHeader eyebrow="Deployment" title="Hostinger application" icon={Wrench} /><CardContent><div className="enterprise-kpi-list"><article><Globe /><div><strong>Storefront</strong><small>https://bjelectronics.shop/</small></div><StatusBadge status="active" /></article><article><ShieldCheck /><div><strong>Administrator</strong><small>/admin/ · private no-store responses</small></div><StatusBadge status="active" /></article><article><Gear /><div><strong>Build command</strong><small>npm run hostinger:build</small></div><Badge>dist</Badge></article></div></CardContent></Card><Card><CardHeader eyebrow="Security boundaries" title="Administrator protection" icon={ShieldCheck} /><CardContent><div className="enterprise-kpi-list">{["HTTP-only administrator session", "CSRF protection on write requests", "RBAC on administrator APIs", "Encrypted integration secrets", "Private no-store admin responses", "Audit history for privileged actions"].map((item) => <article key={item}><CheckCircle /><div><strong>{item}</strong><small>Enabled platform control</small></div></article>)}</div></CardContent></Card></div></div></>;
}

function CommandPalette({ open, onClose, permissions, onNavigate, products, orders }) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (!open) setQuery(""); }, [open]);
  const navigation = NAV_GROUPS.flatMap((group) => group.items).filter(([, , label, permission]) => hasPermission(permissions, permission) && label.toLowerCase().includes(query.toLowerCase()));
  const productResults = query.length > 1 ? products.filter((product) => `${product.name} ${product.sku}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : [];
  const orderResults = query.length > 1 ? orders.filter((order) => `${order.orderNumber} ${order.customerName}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : [];
  return <Dialog open={open} title="Command search" description="Navigate the admin workspace or find operational records." onClose={onClose}><SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages, products or orders" /><div className="enterprise-kpi-list" style={{ marginTop: 14 }}>{navigation.map(([id, Icon, label]) => <article key={id} onClick={() => { onNavigate(id); onClose(); }} style={{ cursor: "pointer" }}><Icon /><div><strong>{label}</strong><small>Open administrator page</small></div><CaretRight /></article>)}{productResults.map((product) => <article key={`p-${product.id}`} onClick={() => { onNavigate("products"); onClose(); }} style={{ cursor: "pointer" }}><ShoppingCart /><div><strong>{product.name}</strong><small>{product.sku}</small></div><Badge>{product.stock} stock</Badge></article>)}{orderResults.map((order) => <article key={`o-${order.id}`} onClick={() => { onNavigate("orders"); onClose(); }} style={{ cursor: "pointer" }}><Package /><div><strong>{order.orderNumber}</strong><small>{order.customerName}</small></div><StatusBadge status={order.status} /></article>)}</div></Dialog>;
}

function Workspace({ user, onLogout }) {
  const toast = useToast();
  const pathSegment = location.pathname.split("/")[2] || "dashboard";
  const [view, setViewState] = useState(TITLES[pathSegment] ? pathSegment : "dashboard");
  const [theme, setTheme] = useState(() => readStorage("bj:enterprise-theme", "light"));
  const [mobile, setMobile] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState({ settings: {}, integrations: [], providerCatalog: {}, roles: [], permissions: [], users: [], environment: [], authorization: { permissions: user.permissions || ["*"] } });
  const [data, setData] = useState({ products: [], orders: [], customers: [], coupons: [], integrations: {}, audit: [], health: null });
  const permissions = bootstrap.authorization?.permissions || user.permissions || [];

  const navigate = useCallback((next) => {
    const nextPath = next.startsWith("/admin/") ? next : `/admin/${next}`;
    history.pushState({}, "", nextPath);
    if (next === "catalog" || nextPath === "/admin/catalog") setViewState("catalog"); else setViewState(nextPath.split("/")[2] || "dashboard");
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const onPop = () => setViewState(location.pathname.split("/")[2] || "dashboard");
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); }
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("popstate", onPop); window.removeEventListener("keydown", onKey); };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.enterpriseTheme = theme;
    writeStorage("bj:enterprise-theme", theme);
  }, [theme]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const control = await apiRequest("/api/admin/control/bootstrap");
      setBootstrap(control);
      const can = (permission) => hasPermission(control.authorization?.permissions, permission);
      const requests = await Promise.allSettled([
        can("catalog.read") ? apiRequest("/api/admin/products") : Promise.resolve({ products: [] }),
        can("orders.read") ? apiRequest("/api/admin/orders") : Promise.resolve({ orders: [] }),
        can("customers.read") ? apiRequest("/api/admin/customers") : Promise.resolve({ customers: [] }),
        can("promotions.manage") ? apiRequest("/api/admin/coupons") : Promise.resolve({ coupons: [] }),
        apiRequest("/api/admin/integrations"),
        apiRequest("/api/health"),
      ]);
      const value = (index, fallback) => requests[index].status === "fulfilled" ? requests[index].value : fallback;
      setData((current) => ({ ...current, products: value(0, { products: [] }).products || [], orders: value(1, { orders: [] }).orders || [], customers: value(2, { customers: [] }).customers || [], coupons: value(3, { coupons: [] }).coupons || [], integrations: value(4, {}), health: value(5, null) }));
    } catch (error) {
      toast(error.message, "error");
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const saveProduct = async (id, payload) => {
    try {
      const response = await apiRequest(id ? `/api/admin/products/${id}` : "/api/admin/products", { method: id ? "PATCH" : "POST", body: payload });
      setData((current) => ({ ...current, products: id ? current.products.map((item) => item.id === id ? response.product : item) : [response.product, ...current.products] }));
      toast(id ? "Product updated." : "Product created.");
      return response.product;
    } catch (error) { toast(error.message, "error"); throw error; }
  };
  const saveOrderStatus = async (id, status) => {
    try {
      const response = await apiRequest(`/api/admin/orders/${id}/status`, { method: "PATCH", body: { status } });
      setData((current) => ({ ...current, orders: current.orders.map((item) => item.id === id ? response.order : item) }));
      toast("Order status updated."); return response.order;
    } catch (error) { toast(error.message, "error"); throw error; }
  };
  const saveCoupon = async (id, payload) => {
    try {
      const response = await apiRequest(id ? `/api/admin/coupons/${id}` : "/api/admin/coupons", { method: id ? "PATCH" : "POST", body: payload });
      setData((current) => ({ ...current, coupons: id ? current.coupons.map((item) => item.id === id ? response.coupon : item) : [response.coupon, ...current.coupons] }));
      toast(id ? "Coupon updated." : "Coupon created."); return response.coupon;
    } catch (error) { toast(error.message, "error"); throw error; }
  };
  const saveSetting = async (group, value) => {
    try {
      await apiRequest(`/api/admin/control/settings/${group}`, { method: "PUT", body: value });
      setBootstrap((current) => ({ ...current, settings: { ...current.settings, [group]: value } }));
      toast("Storefront settings published.");
    } catch (error) { toast(error.message, "error"); throw error; }
  };
  const configureIntegration = async (provider, payload) => {
    try {
      await apiRequest(`/api/admin/control/integrations/${provider}`, { method: "PUT", body: payload });
      const response = await apiRequest("/api/admin/control/integrations");
      setBootstrap((current) => ({ ...current, integrations: response.integrations }));
      toast("Integration configuration saved.");
    } catch (error) { toast(error.message, "error"); throw error; }
  };
  const testIntegration = async (provider) => {
    try {
      const result = await apiRequest(`/api/admin/control/integrations/${provider}/test`, { method: "POST" });
      const response = await apiRequest("/api/admin/control/integrations");
      setBootstrap((current) => ({ ...current, integrations: response.integrations }));
      if (provider === "redis" || provider === "cloudinary") setData((current) => ({ ...current, integrations: { ...current.integrations, [provider]: { status: result.status } } }));
      toast(`${provider.replaceAll("_", " ")} connection verified.`);
    } catch (error) { toast(error.message, "error"); }
  };
  const disconnectIntegration = async (provider) => {
    if (!confirm(`Disconnect ${provider.replaceAll("_", " ")}? Stored credentials will be deleted.`)) return;
    try {
      await apiRequest(`/api/admin/control/integrations/${provider}`, { method: "DELETE" });
      setBootstrap((current) => ({ ...current, integrations: current.integrations.filter((item) => item.provider !== provider) }));
      toast("Integration disconnected.");
    } catch (error) { toast(error.message, "error"); }
  };
  const saveRole = async (role) => {
    try {
      await apiRequest("/api/admin/control/roles", { method: "POST", body: role });
      const response = await apiRequest("/api/admin/control/roles");
      setBootstrap((current) => ({ ...current, roles: response.roles, permissions: response.permissions }));
      toast("Administrator role saved.");
    } catch (error) { toast(error.message, "error"); throw error; }
  };
  const saveUserRoles = async (id, roles) => {
    try {
      await apiRequest(`/api/admin/control/users/${id}/roles`, { method: "PATCH", body: { roles } });
      setBootstrap((current) => ({ ...current, users: current.users.map((item) => item.id === id ? { ...item, roles } : item) }));
      toast("Administrator roles updated.");
    } catch (error) { toast(error.message, "error"); throw error; }
  };
  const loadAudit = async () => {
    try {
      const response = await apiRequest("/api/admin/control/audit?limit=200");
      setData((current) => ({ ...current, audit: response.logs || [] }));
    } catch (error) { toast(error.message, "error"); }
  };
  useEffect(() => { if (view === "audit" && !data.audit.length) loadAudit(); }, [view]);

  if (view === "catalog") return <CatalogOperations onNavigate={(path) => navigate(path)} />;
  const allowedNavigation = NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter(([, , , permission]) => hasPermission(permissions, permission)) })).filter((group) => group.items.length);
  const renderPage = () => {
    if (view === "dashboard") return <DashboardPage data={data} setView={navigate} />;
    if (view === "orders") return <OrdersPage orders={data.orders} onStatusUpdate={saveOrderStatus} />;
    if (view === "products") return <ProductsPage products={data.products} onSave={saveProduct} canWrite={hasPermission(permissions, "catalog.write")} />;
    if (view === "inventory") return <ProductsPage products={data.products} onSave={saveProduct} inventoryOnly canWrite={hasPermission(permissions, "catalog.write")} />;
    if (view === "customers") return <CustomersPage customers={data.customers} />;
    if (view === "promotions") return <PromotionsPage coupons={data.coupons} onSave={saveCoupon} />;
    if (view === "media") return <><PageHeader eyebrow="Digital assets" title="Media library" description="Upload optimized product images and video through signed Cloudinary requests." /><MediaManager adminRequest={apiRequest} /></>;
    if (view === "customization") return <CustomizationPage settings={bootstrap.settings} onSave={saveSetting} />;
    if (view === "integrations") return <IntegrationsPage integrations={bootstrap.integrations} providerCatalog={bootstrap.providerCatalog} onConfigure={configureIntegration} onTest={testIntegration} onDisconnect={disconnectIntegration} />;
    if (view === "administrators") return <AdministratorsPage users={bootstrap.users} roles={bootstrap.roles} permissions={bootstrap.permissions} onRoleSave={saveRole} onUserRoles={saveUserRoles} />;
    if (view === "audit") return <AuditPage logs={data.audit} onRefresh={loadAudit} />;
    if (view === "system") return <SystemPage environment={bootstrap.environment} health={data.health} />;
    return <EmptyState icon={Warning} title="Page unavailable" description="Your role does not allow this administrator page." />;
  };

  if (loading) return <LoadingScreen />;
  return <div className="enterprise-admin">
    <aside className={`enterprise-sidebar ${mobile ? "open" : ""}`}>
      <a className="enterprise-brand" href="/admin/dashboard" onClick={(event) => { event.preventDefault(); navigate("dashboard"); }}><img src="/assets/bj-logo.png" alt="BJ Electronics" /><span><strong>BJ ADMIN</strong><small>Enterprise control center</small></span></a>
      <div className="enterprise-sidebar-scroll">{allowedNavigation.map((group) => <section className="enterprise-nav-group" key={group.label}><span>{group.label}</span><nav>{group.items.map(([id, Icon, label]) => <button key={id} className={view === id ? "active" : ""} onClick={() => navigate(id)}><Icon weight={view === id ? "fill" : "regular"} /><b>{label}</b>{view === id ? <i>•</i> : <CaretRight />}</button>)}</nav></section>)}</div>
      <div className="enterprise-sidebar-footer"><div className="enterprise-user-card"><span className="enterprise-avatar">{initials(user.name)}</span><span><strong>{user.name}</strong><small>{user.roles?.map((role) => role.name || role.code).join(", ") || "Administrator"}</small></span><IconButton label="Sign out" onClick={onLogout}><SignOut /></IconButton></div></div>
    </aside>
    {mobile && <button className="enterprise-mobile-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <div className="enterprise-main">
      <header className="enterprise-topbar"><IconButton className="enterprise-menu-button" label="Open navigation" onClick={() => setMobile(true)}><List /></IconButton><div className="enterprise-topbar-title"><span>Administrator workspace</span><h1>{TITLES[view] || "BJ Electronics"}</h1></div><SearchInput value="" onChange={() => undefined} placeholder="Search or press Ctrl K" className="enterprise-global-search" onClick={() => setCommandOpen(true)} /><div className="enterprise-topbar-actions"><IconButton label={`Use ${theme === "light" ? "dark" : "light"} theme`} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon /> : <Sun />}</IconButton><IconButton className="notification-button" label="Notifications"><Bell /></IconButton><a className="store-link" href="/" target="_blank" rel="noreferrer" aria-label="Open storefront"><Storefront /></a><span className="enterprise-avatar">{initials(user.name)}</span></div></header>
      <main className="enterprise-content">{renderPage()}</main>
    </div>
    <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} permissions={permissions} onNavigate={navigate} products={data.products} orders={data.orders} />
  </div>;
}

function EnterpriseRoot() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiRequest("/api/admin/auth/me").then((response) => setUser(response.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (loading) return;
    const target = user ? (location.pathname.startsWith("/admin/") && location.pathname !== "/admin/login" ? location.pathname : "/admin/dashboard") : "/admin/login";
    if (location.pathname !== target) history.replaceState({}, "", target);
    document.title = user ? "BJ Admin — Enterprise Control Center" : "BJ Admin — Secure Sign In";
  }, [user, loading]);
  const logout = async () => {
    try { await apiRequest("/api/admin/auth/logout", { method: "POST" }); } finally { setUser(null); history.replaceState({}, "", "/admin/login"); }
  };
  if (loading) return <LoadingScreen label="Securing administrator workspace" />;
  return user ? <Workspace user={user} onLogout={logout} /> : <Login onLogin={(administrator) => { setUser(administrator); history.replaceState({}, "", "/admin/dashboard"); }} />;
}

export function AdminEnterprise() {
  return <ToastProvider><EnterpriseRoot /></ToastProvider>;
}
