import { useMemo } from "react";
import {
  Activity,
  ArrowRight,
  ChartBar,
  CheckCircle,
  CloudArrowUp,
  Cube,
  Package,
  ShoppingCart,
  Tag,
  TrendUp,
  UsersThree,
} from "@phosphor-icons/react";
import { Button, Card, DataTable, PageHeader } from "../ui/index.jsx";
import { formatDate, money } from "../../shared/client.js";
import { MetricCard, StatusBadge } from "./components.jsx";

const PIPELINE = ["confirmed", "processing", "shipped", "delivered"];

export function OverviewPage({
  orders = [],
  products = [],
  customers = [],
  coupons = [],
  integrations = {},
  onNavigate,
}) {
  const analytics = useMemo(() => {
    const revenue = orders
      .filter((order) => order.status !== "cancelled")
      .reduce((total, order) => total + Number(order.total || 0), 0);
    const openOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
    const lowStock = products.filter((product) => Number(product.stock || 0) < 10);
    const activeCoupons = coupons.filter((coupon) => coupon.active);
    const pipeline = PIPELINE.map((status) => ({
      status,
      count: orders.filter((order) => order.status === status).length,
    }));
    return {
      revenue,
      openOrders,
      lowStock,
      activeCoupons,
      pipeline,
      maxPipeline: Math.max(1, ...pipeline.map((item) => item.count)),
    };
  }, [coupons, orders, products]);

  const recentOrderColumns = [
    {
      key: "orderNumber",
      label: "Order",
      render: (order) => <span className="ops3-record"><strong>{order.orderNumber}</strong><small>{order.customerName}</small></span>,
    },
    { key: "createdAt", label: "Placed", render: (order) => formatDate(order.createdAt) },
    { key: "total", label: "Total", render: (order) => <strong>{money(order.total, order.currency)}</strong> },
    { key: "status", label: "Status", render: (order) => <StatusBadge value={order.status} /> },
  ];

  return (
    <div className="ops3-page">
      <PageHeader
        eyebrow="Operations overview"
        title="Store performance"
        description="Current fulfillment, catalog, customer and platform signals in one focused workspace."
        actions={<>
          <Button variant="secondary" onClick={() => onNavigate("/admin/orders")}>Review orders</Button>
          <Button onClick={() => onNavigate("/admin/products")}><ShoppingCart /> Manage products</Button>
        </>}
      />

      <section className="ops3-metrics" aria-label="Store metrics">
        <MetricCard label="Gross order value" value={money(analytics.revenue)} detail={`${analytics.openOrders.length} orders still open`} icon={<TrendUp />} tone="primary" />
        <MetricCard label="Total orders" value={orders.length} detail={`${analytics.openOrders.length} require fulfillment`} icon={<Package />} tone="info" />
        <MetricCard label="Catalog products" value={products.length} detail={`${analytics.lowStock.length} below 10 units`} icon={<Cube />} tone="warning" />
        <MetricCard label="Customers" value={customers.length} detail={`${analytics.activeCoupons.length} active promotions`} icon={<UsersThree />} tone="success" />
      </section>

      <div className="ops3-overview-grid">
        <Card className="ops3-pipeline" padding="lg">
          <header className="ops3-card-head"><div><span>Fulfillment</span><h2>Order pipeline</h2><p>Distribution of active orders across each delivery stage.</p></div><ChartBar aria-hidden="true" /></header>
          <div className="ops3-pipeline-list">
            {analytics.pipeline.map((item) => {
              const percentage = Math.round((item.count / analytics.maxPipeline) * 100);
              return (
                <div key={item.status}>
                  <span><StatusBadge value={item.status} /><strong>{item.count}</strong></span>
                  <div className="ops3-progress" role="progressbar" aria-label={`${item.status} orders`} aria-valuemin="0" aria-valuemax={analytics.maxPipeline} aria-valuenow={item.count}>
                    <i style={{ width: `${Math.max(item.count ? 8 : 0, percentage)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="ops3-health" padding="lg">
          <header className="ops3-card-head"><div><span>Platform health</span><h2>Connected services</h2><p>Runtime dependencies used by the production store.</p></div><Activity aria-hidden="true" /></header>
          <div className="ops3-health-list">
            <div><span><CheckCircle weight="fill" /> MySQL database</span><StatusBadge value="ok" /></div>
            <div><span><Activity /> Redis cache</span><StatusBadge value={integrations.redis?.status || "disabled"} /></div>
            <div><span><CloudArrowUp /> Cloudinary media</span><StatusBadge value={integrations.cloudinary?.status || "disabled"} /></div>
          </div>
          <Button variant="secondary" onClick={() => onNavigate("/admin/settings")}>Open system settings <ArrowRight /></Button>
        </Card>

        <Card className="ops3-recent-orders" padding="none">
          <header className="ops3-section-head"><div><span>Latest activity</span><h2>Recent orders</h2></div><Button size="sm" variant="ghost" onClick={() => onNavigate("/admin/orders")}>View all <ArrowRight /></Button></header>
          <DataTable
            caption="Recent store orders"
            columns={recentOrderColumns}
            rows={orders.slice(0, 6)}
            onRowClick={(order) => onNavigate(`/admin/orders?selected=${encodeURIComponent(order.id)}`)}
          />
        </Card>

        <Card className="ops3-stock-watch" padding="lg">
          <header className="ops3-card-head"><div><span>Inventory watch</span><h2>Stock attention</h2><p>Products closest to selling out.</p></div><Cube aria-hidden="true" /></header>
          <div className="ops3-stock-list">
            {analytics.lowStock.slice(0, 6).map((product) => (
              <button key={product.id} onClick={() => onNavigate(`/admin/products?selected=${encodeURIComponent(product.id)}`)}>
                <img src={product.image} alt="" />
                <span><strong>{product.name}</strong><small>{product.sku} · {product.category}</small></span>
                <b>{product.stock} left</b>
              </button>
            ))}
            {!analytics.lowStock.length && <div className="ops3-healthy"><CheckCircle weight="duotone" /><strong>Inventory is healthy</strong><span>No products are below the low-stock threshold.</span></div>}
          </div>
          <Button variant="secondary" onClick={() => onNavigate("/admin/inventory")}>Manage inventory <ArrowRight /></Button>
        </Card>

        <Card className="ops3-quick-actions" padding="lg">
          <header className="ops3-card-head"><div><span>Shortcuts</span><h2>Common workflows</h2><p>Open the most frequently used administration tools.</p></div><Activity aria-hidden="true" /></header>
          <div>
            <button onClick={() => onNavigate("/admin/orders")}><Package /><span><strong>Fulfill orders</strong><small>{analytics.openOrders.length} currently open</small></span><ArrowRight /></button>
            <button onClick={() => onNavigate("/admin/products")}><ShoppingCart /><span><strong>Add or edit products</strong><small>{products.length} catalog records</small></span><ArrowRight /></button>
            <button onClick={() => onNavigate("/admin/promotions")}><Tag /><span><strong>Manage promotions</strong><small>{analytics.activeCoupons.length} campaigns active</small></span><ArrowRight /></button>
          </div>
        </Card>
      </div>
    </div>
  );
}
