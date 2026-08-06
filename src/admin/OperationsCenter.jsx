import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise, ArrowDown, ArrowRight, ArrowUp, ChartBar, CheckCircle,
  Cube, DownloadSimple, Package, Tag, TrendUp, UsersThree, Warning,
} from "@phosphor-icons/react";
import { apiRequest, formatDate, money } from "../shared/client.js";
import { Badge, Button, Card, EmptyState, PageHeader, SearchField, SelectField, Tabs } from "./ui/index.jsx";
import "./operations-center.css";

const tabs = [
  { id: "priority", label: "Priority queue" },
  { id: "orders", label: "Fulfillment" },
  { id: "inventory", label: "Inventory" },
  { id: "campaigns", label: "Campaigns" },
];

const severityOrder = { critical: 0, warning: 1, info: 2 };

function downloadCsv(rows) {
  const columns = ["type", "severity", "title", "detail", "owner", "createdAt"];
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bj-admin-operations-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Metric({ icon: Icon, label, value, detail, tone = "info" }) {
  return <Card className="ops-center-metric" padding="md">
    <span className={`ops-center-metric-icon ${tone}`}><Icon weight="duotone" /></span>
    <div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>
  </Card>;
}

export function OperationsCenter({ onNavigate }) {
  const [data, setData] = useState({ products: [], orders: [], customers: [], coupons: [], integrations: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("priority");
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [sort, setSort] = useState("severity");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [products, orders, customers, coupons, integrations] = await Promise.all([
        apiRequest("/api/admin/products"),
        apiRequest("/api/admin/orders"),
        apiRequest("/api/admin/customers"),
        apiRequest("/api/admin/coupons"),
        apiRequest("/api/admin/integrations"),
      ]);
      setData({
        products: products.products || [],
        orders: orders.orders || [],
        customers: customers.customers || [],
        coupons: coupons.coupons || [],
        integrations,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tasks = useMemo(() => {
    const orderTasks = data.orders
      .filter((order) => !["delivered", "cancelled"].includes(order.status))
      .map((order) => ({
        id: `order-${order.id}`,
        type: "orders",
        severity: order.status === "confirmed" ? "warning" : "info",
        title: `${order.orderNumber} requires fulfillment`,
        detail: `${order.customerName} · ${money(order.total, order.currency)} · ${String(order.status).replaceAll("_", " ")}`,
        owner: "Fulfillment",
        createdAt: order.createdAt,
        action: () => onNavigate("/admin/orders"),
      }));
    const stockTasks = data.products
      .filter((product) => Number(product.stock) < 20)
      .map((product) => ({
        id: `stock-${product.id}`,
        type: "inventory",
        severity: Number(product.stock) < 5 ? "critical" : "warning",
        title: `${product.name} is low in stock`,
        detail: `${product.sku} · ${product.stock} units remaining`,
        owner: "Catalog",
        createdAt: product.updatedAt || product.createdAt,
        action: () => onNavigate("/admin/inventory"),
      }));
    const campaignTasks = data.coupons
      .filter((coupon) => coupon.active && coupon.expiresAt && new Date(coupon.expiresAt).getTime() - Date.now() < 7 * 86400000)
      .map((coupon) => ({
        id: `coupon-${coupon.id}`,
        type: "campaigns",
        severity: "info",
        title: `${coupon.code} expires soon`,
        detail: `Expires ${formatDate(coupon.expiresAt)} · ${coupon.usedCount || 0} uses`,
        owner: "Marketing",
        createdAt: coupon.expiresAt,
        action: () => onNavigate("/admin/promotions"),
      }));
    return [...stockTasks, ...orderTasks, ...campaignTasks];
  }, [data, onNavigate]);

  const visibleTasks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tasks
      .filter((task) => activeTab === "priority" || task.type === activeTab)
      .filter((task) => severity === "all" || task.severity === severity)
      .filter((task) => !normalized || `${task.title} ${task.detail} ${task.owner}`.toLowerCase().includes(normalized))
      .sort((a, b) => sort === "newest"
        ? new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        : severityOrder[a.severity] - severityOrder[b.severity]);
  }, [tasks, activeTab, severity, query, sort]);

  const openOrders = data.orders.filter((order) => !["delivered", "cancelled"].includes(order.status)).length;
  const lowStock = data.products.filter((product) => Number(product.stock) < 20).length;
  const revenue = data.orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + Number(order.total || 0), 0);

  return <main className="ops-center-page">
    <PageHeader
      eyebrow="Operations command center"
      title="Daily execution workspace"
      description="Prioritize fulfillment, inventory and campaign work from one searchable operational queue."
      actions={<>
        <Button variant="secondary" onClick={load} loading={loading}><ArrowClockwise /> Refresh</Button>
        <Button variant="secondary" onClick={() => downloadCsv(visibleTasks)} disabled={!visibleTasks.length}><DownloadSimple /> Export CSV</Button>
        <Button onClick={() => onNavigate("/admin/dashboard")}>Dashboard <ArrowRight /></Button>
      </>}
    />

    {error && <div className="ops-center-alert" role="alert"><Warning weight="fill" /><span><strong>Operations data could not be loaded.</strong>{error}</span><Button variant="secondary" size="sm" onClick={load}>Retry</Button></div>}

    <section className="ops-center-metrics" aria-label="Operations summary">
      <Metric icon={TrendUp} label="Gross order value" value={money(revenue)} detail="Non-cancelled orders" tone="success" />
      <Metric icon={Package} label="Open fulfillment" value={openOrders} detail="Orders requiring action" tone={openOrders ? "warning" : "success"} />
      <Metric icon={Cube} label="Low-stock products" value={lowStock} detail="Below 20 available units" tone={lowStock ? "danger" : "success"} />
      <Metric icon={UsersThree} label="Registered customers" value={data.customers.length} detail="Customer accounts" />
    </section>

    <Card className="ops-center-workspace" padding="none">
      <div className="ops-center-workspace-head">
        <Tabs items={tabs} value={activeTab} onChange={setActiveTab} ariaLabel="Operations queue categories" />
        <div className="ops-center-health" aria-label="Integration status">
          <Badge tone={data.integrations.redis?.status === "ok" ? "success" : "warning"}>Redis {data.integrations.redis?.status || "unknown"}</Badge>
          <Badge tone={data.integrations.cloudinary?.status === "ok" ? "success" : "warning"}>Media {data.integrations.cloudinary?.status || "unknown"}</Badge>
        </div>
      </div>
      <div className="ops-center-toolbar">
        <SearchField value={query} onChange={setQuery} placeholder="Search tasks, products or owners" />
        <SelectField label="Severity" value={severity} onChange={(event) => setSeverity(event.target.value)}>
          <option value="all">All severities</option><option value="critical">Critical</option><option value="warning">Warning</option><option value="info">Information</option>
        </SelectField>
        <SelectField label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="severity">Priority first</option><option value="newest">Newest first</option>
        </SelectField>
      </div>

      <div className="ops-center-list" aria-busy={loading}>
        {visibleTasks.map((task) => <button key={task.id} type="button" className="ops-center-task" onClick={task.action}>
          <span className={`ops-center-severity ${task.severity}`} aria-label={`${task.severity} priority`} />
          <span className="ops-center-task-icon">{task.type === "orders" ? <Package /> : task.type === "inventory" ? <Cube /> : <Tag />}</span>
          <span className="ops-center-task-copy"><strong>{task.title}</strong><small>{task.detail}</small></span>
          <span className="ops-center-owner"><small>Owner</small><strong>{task.owner}</strong></span>
          <span className="ops-center-date"><small>{task.createdAt ? formatDate(task.createdAt) : "Current"}</small></span>
          <ArrowRight />
        </button>)}
        {!loading && !visibleTasks.length && <EmptyState icon={CheckCircle} title="No matching operational tasks" description="The selected queue is clear or the current filters exclude all work." />}
        {loading && <div className="ops-center-loading"><ChartBar /><span>Building operational queue…</span></div>}
      </div>
    </Card>

    <section className="ops-center-footer-cards">
      <Card padding="md"><CheckCircle weight="duotone" /><div><strong>Structured daily workflow</strong><span>Critical inventory issues appear before routine fulfillment and campaign tasks.</span></div></Card>
      <Card padding="md"><ArrowUp /><div><strong>Accessible interaction</strong><span>Every task is keyboard reachable with visible focus and descriptive status labels.</span></div></Card>
      <Card padding="md"><ArrowDown /><div><strong>Exportable operations</strong><span>Filtered queues can be downloaded for offline review and handover.</span></div></Card>
    </section>
  </main>;
}
