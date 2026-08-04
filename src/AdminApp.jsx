import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowSquareOut,
  Bell,
  CaretDown,
  CaretRight,
  ChartLineUp,
  Check,
  CheckCircle,
  Clock,
  Cube,
  Envelope,
  Gear,
  List,
  Lock,
  MagnifyingGlass,
  Package,
  PencilSimple,
  Plus,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  SignOut,
  SquaresFour,
  Storefront,
  Tag,
  Truck,
  UserCircle,
  UsersThree,
  Warning,
  X,
} from "@phosphor-icons/react";
import { storefrontUrl } from "./domain-config.js";
import { importedCatalog } from "./data/caravan-catalog.js";

const demoProducts = importedCatalog;

const demoOrders = [
  { id: "BJ-24018", orderNumber: "BJ-24018", customerName: "BJ Customer", customerPhone: "01700000000", status: "delivered", paymentStatus: "paid", paymentMethod: "cash_on_delivery", total: 158320, createdAt: "2026-07-18T10:30:00Z", items: 2, courier: "Pathao Courier", tracking: "PTH-884012" },
  { id: "BJ-23942", orderNumber: "BJ-23942", customerName: "Nusrat Jahan", customerPhone: "01811111111", status: "shipped", paymentStatus: "paid", paymentMethod: "cash_on_delivery", total: 9070, createdAt: "2026-07-23T13:15:00Z", items: 1, courier: "RedX", tracking: "RDX-230942" },
  { id: "BJ-23871", orderNumber: "BJ-23871", customerName: "Tanvir Ahmed", customerPhone: "01922222222", status: "processing", paymentStatus: "paid", paymentMethod: "cash_on_delivery", total: 29864, createdAt: "2026-07-26T08:45:00Z", items: 1, courier: "", tracking: "" },
  { id: "BJ-23845", orderNumber: "BJ-23845", customerName: "Farhana Rahman", customerPhone: "01633333333", status: "pending", paymentStatus: "awaiting_payment", paymentMethod: "bank_transfer", total: 74005, createdAt: "2026-07-27T12:20:00Z", items: 1, courier: "", tracking: "" },
];

const demoCustomers = [
  { id: "c1", name: "BJ Customer", email: "demo@bjelectronics.shop", phone: "01700000000", orderCount: 3, lifetimeValue: 197254, createdAt: "2026-02-11" },
  { id: "c2", name: "Nusrat Jahan", email: "nusrat@example.com", phone: "01811111111", orderCount: 5, lifetimeValue: 254990, createdAt: "2026-04-03" },
  { id: "c3", name: "Tanvir Ahmed", email: "tanvir@example.com", phone: "01922222222", orderCount: 2, lifetimeValue: 81200, createdAt: "2026-06-19" },
];

const demoCoupons = [
  { id: 1, code: "WELCOME20", discountType: "percent", discountValue: 20, minimumOrder: 5000, usedCount: 186, usageLimit: 1000, active: true },
  { id: 2, code: "TECH10", discountType: "percent", discountValue: 10, minimumOrder: 3000, usedCount: 73, usageLimit: null, active: true },
];

const money = (value) => new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(value);
const isLocalPreview = ["localhost", "127.0.0.1", "terminal.local"].includes(window.location.hostname);

let csrfTokenPromise;

function getCsrfToken() {
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetch("/api/csrf-token", { credentials: "include" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.csrfToken) throw new Error(body?.error || "Could not initialize request security.");
        return body.csrfToken;
      })
      .catch((error) => {
        csrfTokenPromise = undefined;
        throw error;
      });
  }
  return csrfTokenPromise;
}

async function adminRequest(path, options = {}, retryCsrf = true) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers["X-CSRF-Token"] = await getCsrfToken();

  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers,
  });
  const body = response.status === 204 ? null : await response.json();
  if (response.status === 403 && body?.code === "CSRF_TOKEN_INVALID" && retryCsrf) {
    csrfTokenPromise = undefined;
    return adminRequest(path, options, false);
  }
  if (!response.ok) throw new Error(body?.error || "The administrator request could not be completed.");
  return body;
}

function navigateAdmin(path) {
  const next = path.startsWith("/admin") ? path : `/admin/${path}`;
  window.history.pushState({}, "", next);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function AdminLogo() {
  return <div className="ops-logo"><img src="/assets/bj-logo.png" alt="BJ Electronics" /><span>Admin</span></div>;
}

function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ email: isLocalPreview ? "admin@bjelectronics.shop" : "", password: isLocalPreview ? "admin12345" : "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await adminRequest("/api/admin/auth/login", { method: "POST", body: JSON.stringify(form) });
      onLogin(response.user);
    } catch (requestError) {
      if (isLocalPreview && form.email === "admin@bjelectronics.shop" && form.password === "admin12345") {
        const demoUser = { id: "demo-admin", name: "Store Administrator", email: form.email, role: "admin" };
        sessionStorage.setItem("bj-admin-demo", JSON.stringify(demoUser));
        onLogin(demoUser);
      } else {
        setError(requestError.message);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="ops-login">
      <section className="ops-login-brand">
        <AdminLogo />
        <div className="ops-login-copy">
          <span><ShieldCheck weight="fill" /> Protected operations portal</span>
          <h1>Run every part of BJ Electronics from one place.</h1>
          <p>Securely manage orders, inventory, customers, promotions and checkout operations across the store.</p>
        </div>
        <div className="ops-login-points">
          <div><CheckCircle weight="fill" /><span><strong>Role-protected access</strong>Dedicated administrator session and API authorization.</span></div>
          <div><CheckCircle weight="fill" /><span><strong>Operational clarity</strong>Live fulfillment, stock and customer signals.</span></div>
          <div><CheckCircle weight="fill" /><span><strong>Production aware</strong>Separate store and admin domains with environment controls.</span></div>
        </div>
        <small>© 2026 BJ Electronics · Smart tech, better life.</small>
      </section>
      <section className="ops-login-form-wrap">
        <form className="ops-login-form" onSubmit={submit}>
          <div className="ops-login-mobile-logo"><AdminLogo /></div>
          <p>Administrator access</p>
          <h2>Welcome back</h2>
          <span>Sign in with your authorized BJ administrator account.</span>
          <label><b>Email address</b><div><Envelope /><input required type="email" autoComplete="username" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div></label>
          <label><b>Password</b><div><Lock /><input required type={showPassword ? "text" : "password"} autoComplete="current-password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div></label>
          {error && <div className="ops-login-error"><Warning /> {error}</div>}
          <button className="ops-primary" disabled={busy}>{busy ? "Verifying access…" : <>Sign in to Admin <ArrowRight /></>}</button>
          {isLocalPreview && <div className="ops-demo-note"><ShieldCheck /> Local preview credentials are prefilled. Replace them through environment variables before production.</div>}
          <a href={storefrontUrl} className="ops-back-store"><Storefront /> Return to storefront</a>
        </form>
      </section>
    </main>
  );
}

const navItems = [
  ["overview", SquaresFour, "Overview"],
  ["orders", Package, "Orders"],
  ["products", ShoppingCart, "Products"],
  ["inventory", Cube, "Inventory"],
  ["customers", UsersThree, "Customers"],
  ["promotions", Tag, "Promotions"],
  ["settings", Gear, "Settings"],
];

function AdminSidebar({ active, setActive, open, setOpen, user, onLogout }) {
  return (
    <aside className={`ops-sidebar ${open ? "open" : ""}`}>
      <div className="ops-sidebar-head"><AdminLogo /><button onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <nav aria-label="Administrator navigation">
        <span>Workspace</span>
        {navItems.slice(0, 6).map(([id, Icon, label]) => <button key={id} className={active === id ? "active" : ""} onClick={() => { setActive(id); setOpen(false); }}><Icon weight={active === id ? "fill" : "regular"} /><b>{label}</b>{id === "orders" && <i>18</i>}</button>)}
        <span>System</span>
        {navItems.slice(6).map(([id, Icon, label]) => <button key={id} className={active === id ? "active" : ""} onClick={() => { setActive(id); setOpen(false); }}><Icon /><b>{label}</b></button>)}
      </nav>
      <div className="ops-sidebar-foot">
        <div><UserCircle weight="duotone" /><span><strong>{user.name}</strong><small>Administrator</small></span></div>
        <button onClick={onLogout} aria-label="Sign out of Admin"><SignOut /></button>
      </div>
    </aside>
  );
}

function AdminTopbar({ title, user, sidebarOpen, setSidebarOpen, search, setSearch }) {
  return (
    <header className="ops-topbar">
      <button className="ops-menu" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Open navigation"><List /></button>
      <div><span>Administrator workspace</span><h1>{title}</h1></div>
      <label className="ops-search"><MagnifyingGlass /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders, products or customers…" aria-label="Search administration" /><kbd>⌘ K</kbd></label>
      <div className="ops-top-actions">
        <a href={storefrontUrl} aria-label="Open storefront"><ArrowSquareOut /></a>
        <button aria-label="Notifications"><Bell /><i>3</i></button>
        <button className="ops-user-menu"><span>{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><b>{user.name}</b><CaretDown /></button>
      </div>
    </header>
  );
}

function StatusPill({ value }) {
  return <span className={`ops-status ${value}`}>{value}</span>;
}

function OverviewView({ orders, products, setActive }) {
  const revenue = orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + order.total, 0) + 46200;
  const inventory = products.reduce((sum, product) => sum + Number(product.stock), 0);
  return (
    <>
      <section className="ops-welcome">
        <div><p>Tuesday, July 28</p><h2>Good evening, Store Administrator.</h2><span>Here’s what needs your attention across BJ Electronics today.</span></div>
        <button className="ops-primary" onClick={() => setActive("products")}><Plus /> Add product</button>
      </section>
      <section className="ops-metrics">
        <article><div><span>Gross revenue</span><strong>{money(revenue)}</strong><small><b>+12.8%</b> vs last month</small></div><i><ChartLineUp /></i></article>
        <article><div><span>Total orders</span><strong>127</strong><small><b>18</b> awaiting shipment</small></div><i><Receipt /></i></article>
        <article><div><span>Inventory units</span><strong>{inventory}</strong><small><em>{products.filter((product) => product.stock < 15).length}</em> low-stock products</small></div><i><Cube /></i></article>
        <article><div><span>Checkout methods</span><strong>2 active</strong><small><b>COD</b> and bank transfer</small></div><i><ShieldCheck /></i></article>
      </section>
      <div className="ops-overview-grid">
        <section className="ops-card ops-order-activity">
          <header><div><p>Fulfillment</p><h3>Recent orders</h3></div><button onClick={() => setActive("orders")}>View all <CaretRight /></button></header>
          {orders.map((order) => <article key={order.id}><div className="ops-order-icon"><Package /></div><div><strong>{order.orderNumber}</strong><span>{order.customerName} · {order.items} item{order.items > 1 ? "s" : ""}</span></div><b>{money(order.total)}</b><StatusPill value={order.status} /></article>)}
        </section>
        <section className="ops-card ops-stock-watch">
          <header><div><p>Inventory watch</p><h3>Stock attention</h3></div><button onClick={() => setActive("inventory")}>Manage <CaretRight /></button></header>
          {products.filter((product) => product.stock < 20).map((product) => <article key={product.id}><img src={product.image} alt="" /><div><strong>{product.name}</strong><span>{product.sku}</span></div><div className="ops-stock-bar"><i style={{ width: `${Math.min(100, product.stock * 4)}%` }} /></div><b>{product.stock} left</b></article>)}
        </section>
        <section className="ops-card ops-quick-actions">
          <header><div><p>Shortcuts</p><h3>Quick actions</h3></div></header>
          <div><button onClick={() => setActive("orders")}><Truck /><span><strong>Fulfill orders</strong><small>18 waiting</small></span><CaretRight /></button><button onClick={() => setActive("products")}><Plus /><span><strong>Add product</strong><small>Grow catalog</small></span><CaretRight /></button><button onClick={() => setActive("promotions")}><Tag /><span><strong>Create offer</strong><small>Boost conversion</small></span><CaretRight /></button></div>
        </section>
      </div>
    </>
  );
}

function OrdersView({ orders, setOrders }) {
  const [selected, setSelected] = useState(orders[1]);
  const [filter, setFilter] = useState("all");
  const visible = filter === "all" ? orders : orders.filter((order) => order.status === filter);
  const updateStatus = async (status) => {
    const updated = { ...selected, status };
    setSelected(updated);
    setOrders((items) => items.map((order) => order.id === selected.id ? updated : order));
    try { await adminRequest(`/api/admin/orders/${selected.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); } catch { /* Local preview remains interactive. */ }
  };
  return (
    <div className="ops-orders-layout">
      <section className="ops-card ops-table-card">
        <header><div><p>Order management</p><h3>All orders</h3></div><div className="ops-filter">{["all", "pending", "processing", "shipped", "delivered"].map((status) => <button key={status} className={filter === status ? "active" : ""} onClick={() => setFilter(status)}>{status}</button>)}</div></header>
        <div className="ops-table">
          <div className="ops-tr ops-th"><span>Order</span><span>Customer</span><span>Date</span><span>Total</span><span>Status</span><span></span></div>
          {visible.map((order) => <button className={`ops-tr ${selected?.id === order.id ? "selected" : ""}`} key={order.id} onClick={() => setSelected(order)}><span><strong>{order.orderNumber}</strong><small>{order.items} item{order.items > 1 ? "s" : ""}</small></span><span><strong>{order.customerName}</strong><small>{order.customerPhone}</small></span><span>{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span><b>{money(order.total)}</b><StatusPill value={order.status} /><CaretRight /></button>)}
        </div>
      </section>
      {selected && <aside className="ops-card ops-order-detail">
        <header><div><p>Order details</p><h3>{selected.orderNumber}</h3></div><StatusPill value={selected.status} /></header>
        <div className="ops-detail-block"><span>Customer</span><strong>{selected.customerName}</strong><small>{selected.customerPhone}</small></div>
        <div className="ops-detail-grid"><span><small>Payment method</small><b>{(selected.paymentMethod || "cash_on_delivery").replaceAll("_", " ")}</b></span><span><small>Order total</small><b>{money(selected.total)}</b></span><span><small>Items</small><b>{selected.items}</b></span><span><small>Placed</small><b>{new Date(selected.createdAt).toLocaleDateString()}</b></span></div>
        <label className="ops-field"><span>Fulfillment status</span><select value={selected.status} onChange={(event) => updateStatus(event.target.value)}><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></label>
        <label className="ops-field"><span>Courier</span><input value={selected.courier} onChange={(event) => setSelected({ ...selected, courier: event.target.value })} placeholder="Select or enter courier" /></label>
        <label className="ops-field"><span>Tracking reference</span><input value={selected.tracking} onChange={(event) => setSelected({ ...selected, tracking: event.target.value })} placeholder="Courier tracking number" /></label>
        <button className="ops-primary"><Truck /> Save fulfillment update</button>
        <button className="ops-danger">Cancel order</button>
      </aside>}
    </div>
  );
}

function ProductsView({ products, setProducts, inventoryOnly = false }) {
  const [query, setQuery] = useState("");
  const visible = products.filter((product) => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query.toLowerCase()));
  const updateProduct = async (id, patch) => {
    setProducts((items) => items.map((product) => product.id === id ? { ...product, ...patch } : product));
    try { await adminRequest(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); } catch { /* Local preview remains interactive. */ }
  };
  return (
    <section className="ops-card ops-table-card">
      <header><div><p>{inventoryOnly ? "Stock control" : "Catalog"}</p><h3>{inventoryOnly ? "Inventory management" : "Product catalog"}</h3></div><label className="ops-inline-search"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products…" /></label><button className="ops-primary"><Plus /> Add product</button></header>
      <div className="ops-product-table">
        <div className="ops-product-row ops-product-head"><span>Product</span><span>Price</span><span>Stock</span><span>Visibility</span><span>Actions</span></div>
        {visible.map((product) => <div className="ops-product-row" key={product.id}><div><img src={product.image} alt="" /><span><strong>{product.name}</strong><small>{product.sku} · {product.category}{product.subcategory ? ` / ${product.subcategory}` : ""}</small></span></div><label><span>৳</span><input aria-label={`Price for ${product.name}`} value={product.price} onChange={(event) => updateProduct(product.id, { price: Number(event.target.value) })} /></label><div className="ops-stock-control"><button aria-label={`Decrease ${product.name} stock`} onClick={() => updateProduct(product.id, { stock: Math.max(0, product.stock - 1) })}>−</button><strong>{product.stock}</strong><button aria-label={`Increase ${product.name} stock`} onClick={() => updateProduct(product.id, { stock: product.stock + 1 })}>+</button></div><button className={`ops-toggle ${product.active ? "active" : ""}`} onClick={() => updateProduct(product.id, { active: !product.active })}>{product.active ? "Active" : "Hidden"}</button><button className="ops-edit" aria-label={`Edit ${product.name}`}><PencilSimple /> Edit</button></div>)}
      </div>
    </section>
  );
}

function CustomersView({ customers }) {
  const [query, setQuery] = useState("");
  const visible = customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="ops-card ops-table-card">
      <header><div><p>Customer relationships</p><h3>Customer directory</h3></div><label className="ops-inline-search"><MagnifyingGlass /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers…" /></label></header>
      <div className="ops-customer-table">
        <div className="ops-customer-row ops-customer-head"><span>Customer</span><span>Contact</span><span>Orders</span><span>Lifetime value</span><span>Joined</span><span></span></div>
        {visible.map((customer) => <button className="ops-customer-row" key={customer.id}><span className="ops-customer-name"><i>{customer.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</i><strong>{customer.name}</strong></span><span><strong>{customer.email}</strong><small>{customer.phone}</small></span><b>{customer.orderCount}</b><b>{money(customer.lifetimeValue)}</b><span>{new Date(customer.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span><CaretRight /></button>)}
      </div>
    </section>
  );
}

function PromotionsView({ coupons, setCoupons }) {
  const [draft, setDraft] = useState({ code: "", discountType: "percent", discountValue: 10, minimumOrder: 50, usageLimit: "", startsAt: "", expiresAt: "" });
  const create = async (event) => {
    event.preventDefault();
    const coupon = { ...draft, id: Date.now(), code: draft.code.toUpperCase(), active: true, usedCount: 0, usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null };
    setCoupons((items) => [coupon, ...items]);
    setDraft({ ...draft, code: "", startsAt: "", expiresAt: "" });
    try { await adminRequest("/api/admin/coupons", { method: "POST", body: JSON.stringify(coupon) }); } catch { /* Local preview remains interactive. */ }
  };
  return (
    <div className="ops-promo-layout">
      <section className="ops-card">
        <header><div><p>Campaigns</p><h3>Coupon management</h3></div><span>{coupons.filter((coupon) => coupon.active).length} active</span></header>
        <div className="ops-coupon-list">{coupons.map((coupon) => <article key={coupon.id}><i><Tag /></i><div><strong>{coupon.code}</strong><span>{coupon.discountType === "percent" ? `${coupon.discountValue}% off` : money(coupon.discountValue)} · Min. {money(coupon.minimumOrder)}</span></div><div><strong>{coupon.usedCount}</strong><span>{coupon.usageLimit ? `of ${coupon.usageLimit}` : "redemptions"}</span></div><button className={`ops-toggle ${coupon.active ? "active" : ""}`} onClick={() => setCoupons((items) => items.map((item) => item.id === coupon.id ? { ...item, active: !item.active } : item))}>{coupon.active ? "Active" : "Paused"}</button><button aria-label={`Edit ${coupon.code}`}><PencilSimple /></button></article>)}</div>
      </section>
      <section className="ops-card ops-coupon-create">
        <header><div><p>New campaign</p><h3>Create coupon</h3></div></header>
        <form onSubmit={create}><label className="ops-field"><span>Coupon code</span><input required value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} placeholder="SUMMER25" /></label><div className="ops-form-pair"><label className="ops-field"><span>Discount type</span><select value={draft.discountType} onChange={(event) => setDraft({ ...draft, discountType: event.target.value })}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label><label className="ops-field"><span>Value</span><input required type="number" min="1" value={draft.discountValue} onChange={(event) => setDraft({ ...draft, discountValue: Number(event.target.value) })} /></label></div><div className="ops-form-pair"><label className="ops-field"><span>Minimum order</span><input type="number" min="0" value={draft.minimumOrder} onChange={(event) => setDraft({ ...draft, minimumOrder: Number(event.target.value) })} /></label><label className="ops-field"><span>Usage limit</span><input type="number" min="1" value={draft.usageLimit} onChange={(event) => setDraft({ ...draft, usageLimit: event.target.value })} placeholder="Unlimited" /></label></div><div className="ops-form-pair"><label className="ops-field"><span>Starts</span><input type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></label><label className="ops-field"><span>Expires</span><input type="datetime-local" value={draft.expiresAt} onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })} /></label></div><button className="ops-primary"><Plus /> Create campaign</button></form>
      </section>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="ops-settings-grid">
      <section className="ops-card"><header><div><p>Domain architecture</p><h3>Store surfaces</h3></div><CheckCircle weight="fill" className="ops-ok" /></header><div className="ops-domain"><i><Storefront /></i><div><strong>Customer storefront</strong><span>https://www.bjelectronics.shop</span></div><b>Store</b></div><div className="ops-domain"><i><ShieldCheck /></i><div><strong>Protected administrator portal</strong><span>https://admin.bjelectronics.shop</span></div><b>Admin</b></div></section>
      <section className="ops-card"><header><div><p>Checkout policy</p><h3>Offline payment methods</h3></div><CheckCircle weight="fill" className="ops-ok" /></header><div className="ops-gateway-state"><ShieldCheck weight="duotone" /><h4>No external payment gateway</h4><p>Orders use cash on delivery or bank transfer. Inventory is reserved atomically when an order is confirmed.</p><button className="ops-secondary">Methods active</button></div></section>
      <section className="ops-card"><header><div><p>Security</p><h3>Administrator access</h3></div></header><div className="ops-security-list"><div><CheckCircle /><span><strong>Dedicated admin cookie</strong><small>HTTP-only, SameSite Strict, 8-hour expiry</small></span></div><div><CheckCircle /><span><strong>Role validation</strong><small>Every admin API request verifies the administrator role</small></span></div><div><CheckCircle /><span><strong>Separate login route</strong><small>Customer sessions cannot access operations APIs</small></span></div></div></section>
    </div>
  );
}

function AdminWorkspace({ user, onLogout }) {
  const [active, setActive] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState(demoProducts);
  const [orders, setOrders] = useState(demoOrders);
  const [customers, setCustomers] = useState(demoCustomers);
  const [coupons, setCoupons] = useState(demoCoupons);
  useEffect(() => {
    adminRequest("/api/admin/products").then((response) => response.products?.length && setProducts(response.products)).catch(() => {});
    adminRequest("/api/admin/orders").then((response) => response.orders?.length && setOrders(response.orders)).catch(() => {});
    adminRequest("/api/admin/customers").then((response) => response.customers?.length && setCustomers(response.customers)).catch(() => {});
    adminRequest("/api/admin/coupons").then((response) => response.coupons?.length && setCoupons(response.coupons)).catch(() => {});
  }, []);
  const titles = { overview: "Overview", orders: "Orders", products: "Products", inventory: "Inventory", customers: "Customers", promotions: "Promotions", settings: "Settings" };
  const content = useMemo(() => {
    if (active === "overview") return <OverviewView orders={orders} products={products} setActive={setActive} />;
    if (active === "orders") return <OrdersView orders={orders} setOrders={setOrders} />;
    if (active === "products") return <ProductsView products={products} setProducts={setProducts} />;
    if (active === "inventory") return <ProductsView products={products} setProducts={setProducts} inventoryOnly />;
    if (active === "customers") return <CustomersView customers={customers} />;
    if (active === "promotions") return <PromotionsView coupons={coupons} setCoupons={setCoupons} />;
    return <SettingsView />;
  }, [active, orders, products, customers, coupons]);
  return (
    <div className="ops-app">
      <AdminSidebar active={active} setActive={setActive} open={sidebarOpen} setOpen={setSidebarOpen} user={user} onLogout={onLogout} />
      {sidebarOpen && <button className="ops-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation overlay" />}
      <div className="ops-main">
        <AdminTopbar title={titles[active]} user={user} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} search={search} setSearch={setSearch} />
        <main className="ops-content">{content}</main>
      </div>
    </div>
  );
}

export function AdminApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const syncPath = () => {
      if (!window.location.pathname.startsWith("/admin")) navigateAdmin(user ? "dashboard" : "login");
    };
    window.addEventListener("popstate", syncPath);
    adminRequest("/api/admin/auth/me").then((response) => setUser(response.user)).catch(() => {
      if (isLocalPreview) {
        try { setUser(JSON.parse(sessionStorage.getItem("bj-admin-demo")) || null); } catch { setUser(null); }
      }
    }).finally(() => setLoading(false));
    return () => window.removeEventListener("popstate", syncPath);
  }, []);
  useEffect(() => {
    if (loading) return;
    const target = user ? "/admin/dashboard" : "/admin/login";
    if (window.location.pathname !== target) window.history.replaceState({}, "", target);
    document.title = user ? "BJ Admin — Commerce Control Center" : "BJ Admin — Secure Sign In";
  }, [user, loading]);
  const login = (admin) => {
    setUser(admin);
    window.history.replaceState({}, "", "/admin/dashboard");
  };
  const logout = async () => {
    try { await adminRequest("/api/admin/auth/logout", { method: "POST" }); } catch { /* Clear local session regardless. */ }
    sessionStorage.removeItem("bj-admin-demo");
    setUser(null);
    window.history.replaceState({}, "", "/admin/login");
  };
  if (loading) return <div className="ops-loading"><img src="/assets/bj-logo.png" alt="BJ Electronics" /><span>Securing administrator workspace…</span></div>;
  return user ? <AdminWorkspace user={user} onLogout={logout} /> : <AdminLogin onLogin={login} />;
}
