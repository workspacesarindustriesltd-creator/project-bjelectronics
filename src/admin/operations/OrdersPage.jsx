import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  Eye,
  Package,
  Receipt,
  Truck,
} from "@phosphor-icons/react";
import {
  Button,
  Card,
  DataTable,
  IconButton,
  PageHeader,
  Pagination,
  SearchField,
  Select,
  Tabs,
} from "../ui/index.jsx";
import { formatDate, money } from "../../shared/client.js";
import {
  BulkBar,
  DetailList,
  Drawer,
  MetricCard,
  SortSelect,
  StatusBadge,
  Toolbar,
  humanize,
} from "./components.jsx";

const PAGE_SIZE = 12;
const OPEN_STATUSES = new Set(["confirmed", "processing", "shipped", "pending"]);
const STATUS_OPTIONS = ["confirmed", "processing", "shipped", "delivered", "cancelled"];

function orderMatchesTab(order, tab) {
  if (tab === "open") return OPEN_STATUSES.has(order.status);
  if (tab === "delivered") return order.status === "delivered";
  if (tab === "cancelled") return order.status === "cancelled";
  return true;
}

function sortOrders(rows, sort) {
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
    if (sort === "highest") return Number(b.total || 0) - Number(a.total || 0);
    if (sort === "lowest") return Number(a.total || 0) - Number(b.total || 0);
    if (sort === "customer") return String(a.customerName).localeCompare(String(b.customerName));
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

export function OrdersPage({ orders, onUpdateStatus }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [draftStatus, setDraftStatus] = useState("confirmed");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("processing");

  const counts = useMemo(() => ({
    all: orders.length,
    open: orders.filter((order) => OPEN_STATUSES.has(order.status)).length,
    delivered: orders.filter((order) => order.status === "delivered").length,
    cancelled: orders.filter((order) => order.status === "cancelled").length,
  }), [orders]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sortOrders(orders.filter((order) => {
      const matchesQuery = !normalized || `${order.orderNumber} ${order.customerName} ${order.customerPhone || ""} ${order.paymentMethod || ""}`.toLowerCase().includes(normalized);
      const matchesStatus = status === "all" || order.status === status;
      return matchesQuery && matchesStatus && orderMatchesTab(order, tab);
    }), sort);
  }, [orders, query, sort, status, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const visibleIds = visible.map((order) => order.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const grossValue = orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + Number(order.total || 0), 0);

  useEffect(() => setPage(1), [query, sort, status, tab]);
  useEffect(() => {
    if (!selectedOrder) return;
    const latest = orders.find((order) => order.id === selectedOrder.id);
    if (latest) setSelectedOrder(latest);
  }, [orders, selectedOrder?.id]);
  useEffect(() => setDraftStatus(selectedOrder?.status || "confirmed"), [selectedOrder]);

  const toggleSelected = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const updateSelected = async () => {
    if (!selectedOrder || draftStatus === selectedOrder.status) return;
    setBusy(true);
    try {
      const updated = await onUpdateStatus(selectedOrder.id, draftStatus);
      setSelectedOrder(updated);
    } finally {
      setBusy(false);
    }
  };

  const applyBulkStatus = async () => {
    setBusy(true);
    try {
      for (const id of selectedIds) await onUpdateStatus(id, bulkStatus);
      setSelectedIds(new Set());
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: "select",
      label: <input type="checkbox" aria-label="Select visible orders" checked={allVisibleSelected} onChange={toggleVisible} />,
      width: 44,
      render: (order) => <input type="checkbox" aria-label={`Select ${order.orderNumber}`} checked={selectedIds.has(order.id)} onClick={(event) => event.stopPropagation()} onChange={() => toggleSelected(order.id)} />,
    },
    {
      key: "order",
      label: "Order",
      render: (order) => <span className="ops2-primary-cell"><strong>{order.orderNumber}</strong><small>{humanize(order.paymentMethod || "not specified")}</small></span>,
    },
    {
      key: "customer",
      label: "Customer",
      render: (order) => <span className="ops2-primary-cell"><strong>{order.customerName}</strong><small>{order.customerPhone || "No phone"}</small></span>,
    },
    { key: "createdAt", label: "Placed", render: (order) => formatDate(order.createdAt) },
    { key: "total", label: "Total", render: (order) => <strong>{money(order.total, order.currency)}</strong> },
    { key: "status", label: "Status", render: (order) => <StatusBadge value={order.status} /> },
    {
      key: "actions",
      label: "",
      width: 54,
      render: (order) => <IconButton label={`View ${order.orderNumber}`} onClick={(event) => { event.stopPropagation(); setSelectedOrder(order); }}><Eye /></IconButton>,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Fulfillment center"
        title="Orders"
        description="Review customer orders, prioritize fulfillment, update statuses, and process multiple records from one workspace."
        actions={<Button variant="secondary" onClick={() => window.print()}><Receipt /> Print view</Button>}
      />

      <section className="ops2-metrics" aria-label="Order metrics">
        <MetricCard label="Gross order value" value={money(grossValue)} detail="Excluding cancelled orders" icon={<Receipt />} />
        <MetricCard label="Open orders" value={counts.open} detail="Confirmed, processing or shipped" icon={<Clock />} tone="warning" />
        <MetricCard label="In transit" value={orders.filter((order) => order.status === "shipped").length} detail="Courier handoff completed" icon={<Truck />} tone="info" />
        <MetricCard label="Delivered" value={counts.delivered} detail="Completed fulfillment" icon={<CheckCircle />} tone="success" />
      </section>

      <Card className="ops2-work-card" padding="none">
        <div className="ops2-tabs-wrap">
          <Tabs
            value={tab}
            onChange={setTab}
            label="Order views"
            items={[
              { value: "all", label: "All", count: counts.all },
              { value: "open", label: "Open", count: counts.open },
              { value: "delivered", label: "Delivered", count: counts.delivered },
              { value: "cancelled", label: "Cancelled", count: counts.cancelled },
            ]}
          />
        </div>
        <Toolbar>
          <SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer, phone or payment" label="Search orders" />
          <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by order status">
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
          </Select>
          <SortSelect value={sort} onChange={(event) => setSort(event.target.value)} options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "highest", label: "Highest total" },
            { value: "lowest", label: "Lowest total" },
            { value: "customer", label: "Customer A–Z" },
          ]} />
          <span className="ops2-result-count">{filtered.length} results</span>
        </Toolbar>

        <BulkBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
          <Select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} aria-label="Bulk status">
            {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}
          </Select>
          <Button size="sm" loading={busy} onClick={applyBulkStatus}>Apply status</Button>
        </BulkBar>

        <DataTable columns={columns} rows={visible} caption="Administrator order list" onRowClick={setSelectedOrder} />
        <div className="ops2-card-footer">
          <span>Showing {visible.length} of {filtered.length}</span>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </Card>

      <Drawer
        open={Boolean(selectedOrder)}
        title={selectedOrder?.orderNumber || "Order details"}
        description="Customer, payment and fulfillment information"
        onClose={() => setSelectedOrder(null)}
        footer={<><Button variant="secondary" onClick={() => setSelectedOrder(null)}>Close</Button><Button loading={busy} disabled={draftStatus === selectedOrder?.status} onClick={updateSelected}>Save status</Button></>}
      >
        {selectedOrder && <div className="ops2-detail-stack">
          <div className="ops2-detail-hero"><Package weight="duotone" /><div><span>Current status</span><StatusBadge value={selectedOrder.status} /></div><strong>{money(selectedOrder.total, selectedOrder.currency)}</strong></div>
          <DetailList items={[
            { label: "Customer", value: selectedOrder.customerName },
            { label: "Phone", value: selectedOrder.customerPhone },
            { label: "Placed", value: formatDate(selectedOrder.createdAt) },
            { label: "Payment", value: humanize(selectedOrder.paymentMethod) },
            { label: "Payment status", value: humanize(selectedOrder.paymentStatus || "not recorded") },
            { label: "Shipping address", value: selectedOrder.shippingAddress, wide: true },
          ]} />
          <label className="ops2-status-editor"><span>Fulfillment status</span><Select value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)} disabled={busy}>{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{humanize(option)}</option>)}</Select></label>
        </div>}
      </Drawer>
    </>
  );
}
