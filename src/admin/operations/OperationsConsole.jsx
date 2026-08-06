import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  Bell,
  Cube,
  Database,
  Gear,
  ImageSquare,
  List,
  Moon,
  Package,
  ShoppingCart,
  SignOut,
  SquaresFour,
  Storefront,
  Sun,
  Tag,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { Avatar, Button, IconButton, ToastRegion } from "../ui/index.jsx";
import { apiRequest, readStorage, writeStorage } from "../../shared/client.js";
import { CustomersPage } from "./CustomersPage.jsx";
import { InlineNotice, LoadingPanel } from "./components.jsx";
import { OrdersPage } from "./OrdersPage.jsx";
import { ProductsPage } from "./ProductsPage.jsx";
import "./operations.css";

const OPERATION_SECTIONS = new Set(["orders", "products", "inventory", "customers"]);
const PRIMARY_NAV = [
  ["/admin/dashboard", SquaresFour, "Overview"],
  ["/admin/orders", Package, "Orders"],
  ["/admin/products", ShoppingCart, "Products"],
  ["/admin/inventory", Cube, "Inventory"],
  ["/admin/customers", UsersThree, "Customers"],
];
const SECONDARY_NAV = [
  ["/admin/promotions", Tag, "Promotions"],
  ["/admin/media", ImageSquare, "Media library"],
  ["/admin/catalog", Database, "Catalog operations"],
  ["/admin/settings", Gear, "Settings"],
];

export function isOperationsPath(pathname = window.location.pathname) {
  return OPERATION_SECTIONS.has(pathname.split("/")[2]);
}

function currentSection(pathname) {
  const section = pathname.split("/")[2];
  return OPERATION_SECTIONS.has(section) ? section : "orders";
}

function dispatchNavigation(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new CustomEvent("admin:navigation", { detail: { path } }));
}

function Sidebar({ section, open, setOpen, user, onNavigate, onLogout }) {
  const item = ([path, Icon, label]) => {
    const active = path === `/admin/${section}`;
    return <button key={path} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => { onNavigate(path); setOpen(false); }}><Icon weight={active ? "fill" : "regular"} /><span>{label}</span></button>;
  };
  return (
    <aside className={`ops2-sidebar ${open ? "open" : ""}`} aria-label="Administrator navigation">
      <div className="ops2-brand"><img src="/assets/bj-logo.png" alt="BJ Electronics" /><span><strong>BJ Admin</strong><small>Operations workspace</small></span><IconButton label="Close navigation" onClick={() => setOpen(false)}><X /></IconButton></div>
      <nav><small>Store operations</small>{PRIMARY_NAV.map(item)}<small>Tools and system</small>{SECONDARY_NAV.map(item)}</nav>
      <div className="ops2-sidebar-foot"><Avatar name={user?.name || "Administrator"} /><span><strong>{user?.name || "Administrator"}</strong><small>{user?.role || "admin"}</small></span><IconButton label="Sign out" onClick={onLogout}><SignOut /></IconButton></div>
    </aside>
  );
}

function Topbar({ section, user, theme, setTheme, onMenu, onNavigate, onRefresh, refreshing }) {
  const titles = { orders: "Order operations", products: "Product catalog", inventory: "Inventory control", customers: "Customer management" };
  return (
    <header className="ops2-topbar">
      <IconButton label="Open navigation" className="ops2-menu-button" onClick={onMenu}><List /></IconButton>
      <div><span>Administrator workspace</span><h1>{titles[section]}</h1></div>
      <div className="ops2-topbar-actions">
        <IconButton label="Refresh workspace data" onClick={onRefresh} disabled={refreshing}><ArrowClockwise className={refreshing ? "ui-spin" : ""} /></IconButton>
        <IconButton label={`Use ${theme === "light" ? "dark" : "light"} theme`} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon /> : <Sun />}</IconButton>
        <IconButton label="Notifications"><Bell /></IconButton>
        <IconButton label="Open storefront" onClick={() => window.open("/", "_blank", "noopener,noreferrer")}><Storefront /></IconButton>
        <button className="ops2-user-button" onClick={() => onNavigate("/admin/settings")}><Avatar name={user?.name || "Administrator"} /><span><strong>{user?.name || "Administrator"}</strong><small>Administrator</small></span></button>
      </div>
    </header>
  );
}

export function OperationsConsole({ path, onNavigate }) {
  const section = currentSection(path);
  const [mobile, setMobile] = useState(false);
  const [theme, setTheme] = useState(() => readStorage("bj:admin-theme", "light"));
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, tone = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, message, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4500);
  }, []);

  const load = useCallback(async ({ initial = false } = {}) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const [me, orderResponse, productResponse, customerResponse] = await Promise.all([
        apiRequest("/api/admin/auth/me"),
        apiRequest("/api/admin/orders"),
        apiRequest("/api/admin/products"),
        apiRequest("/api/admin/customers"),
      ]);
      setUser(me.user);
      setOrders(orderResponse.orders || []);
      setProducts(productResponse.products || []);
      setCustomers(customerResponse.customers || []);
    } catch (loadError) {
      setError(loadError.message);
      if (loadError.status === 401) onNavigate("/admin/login");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onNavigate]);

  useEffect(() => { load({ initial: true }); }, [load]);
  useEffect(() => {
    document.documentElement.dataset.adminTheme = theme;
    writeStorage("bj:admin-theme", theme);
  }, [theme]);
  useEffect(() => {
    document.title = `BJ Admin — ${section[0].toUpperCase()}${section.slice(1)}`;
  }, [section]);

  const saveProduct = useCallback(async (id, data) => {
    try {
      const response = await apiRequest(id ? `/api/admin/products/${id}` : "/api/admin/products", { method: id ? "PATCH" : "POST", body: data });
      setProducts((items) => id ? items.map((item) => item.id === id ? response.product : item) : [response.product, ...items]);
      notify(id ? "Product changes saved." : "Product created successfully.");
      return response.product;
    } catch (saveError) {
      notify(saveError.message, "error");
      throw saveError;
    }
  }, [notify]);

  const updateOrderStatus = useCallback(async (id, status) => {
    try {
      const response = await apiRequest(`/api/admin/orders/${id}/status`, { method: "PATCH", body: { status } });
      setOrders((items) => items.map((item) => item.id === id ? response.order : item));
      notify(`${response.order.orderNumber} updated to ${status.replaceAll("_", " ")}.`);
      return response.order;
    } catch (saveError) {
      notify(saveError.message, "error");
      throw saveError;
    }
  }, [notify]);

  const logout = async () => {
    try { await apiRequest("/api/admin/auth/logout", { method: "POST" }); }
    finally { onNavigate("/admin/login"); }
  };

  const content = useMemo(() => {
    if (section === "orders") return <OrdersPage orders={orders} onUpdateStatus={updateOrderStatus} />;
    if (section === "customers") return <CustomersPage customers={customers} />;
    return <ProductsPage products={products} onSaveProduct={saveProduct} request={apiRequest} inventoryOnly={section === "inventory"} />;
  }, [customers, orders, products, saveProduct, section, updateOrderStatus]);

  return (
    <div className="ops2-app">
      <Sidebar section={section} open={mobile} setOpen={setMobile} user={user} onNavigate={onNavigate} onLogout={logout} />
      {mobile && <button className="ops2-mobile-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
      <div className="ops2-main">
        <Topbar section={section} user={user} theme={theme} setTheme={setTheme} onMenu={() => setMobile(true)} onNavigate={onNavigate} onRefresh={() => load()} refreshing={refreshing} />
        <main className="ops2-content">
          {error && <InlineNotice tone="error" action={<Button size="sm" variant="secondary" onClick={() => load()}>Retry</Button>}>{error}</InlineNotice>}
          {loading ? <LoadingPanel /> : content}
        </main>
      </div>
      <ToastRegion items={toasts} onDismiss={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />
    </div>
  );
}

export function navigateOperations(path) {
  dispatchNavigation(path);
}
