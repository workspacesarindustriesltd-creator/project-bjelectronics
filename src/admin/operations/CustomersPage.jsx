import { useEffect, useMemo, useState } from "react";
import {
  Envelope,
  Eye,
  Phone,
  Star,
  UserPlus,
  UsersThree,
} from "@phosphor-icons/react";
import {
  Avatar,
  Button,
  Card,
  DataTable,
  IconButton,
  PageHeader,
  Pagination,
  SearchField,
  Tabs,
} from "../ui/index.jsx";
import { formatDate, money } from "../../shared/client.js";
import {
  DetailList,
  Drawer,
  MetricCard,
  SortSelect,
  Toolbar,
} from "./components.jsx";

const PAGE_SIZE = 12;

function customerTier(customer) {
  if (Number(customer.lifetimeValue || 0) >= 100000) return "high-value";
  if (Number(customer.orderCount || 0) >= 2) return "repeat";
  return "new";
}

function sortCustomers(rows, sort) {
  return [...rows].sort((a, b) => {
    if (sort === "name-desc") return String(b.name).localeCompare(String(a.name));
    if (sort === "value-high") return Number(b.lifetimeValue || 0) - Number(a.lifetimeValue || 0);
    if (sort === "orders-high") return Number(b.orderCount || 0) - Number(a.orderCount || 0);
    if (sort === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
    return String(a.name).localeCompare(String(b.name));
  });
}

export function CustomersPage({ customers }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("value-high");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);

  const counts = useMemo(() => ({
    all: customers.length,
    new: customers.filter((customer) => customerTier(customer) === "new").length,
    repeat: customers.filter((customer) => customerTier(customer) === "repeat").length,
    "high-value": customers.filter((customer) => customerTier(customer) === "high-value").length,
  }), [customers]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sortCustomers(customers.filter((customer) => {
      const matchesQuery = !normalized || `${customer.name} ${customer.email} ${customer.phone || ""}`.toLowerCase().includes(normalized);
      return matchesQuery && (tab === "all" || customerTier(customer) === tab);
    }), sort);
  }, [customers, query, sort, tab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const lifetimeValue = customers.reduce((sum, customer) => sum + Number(customer.lifetimeValue || 0), 0);
  const totalOrders = customers.reduce((sum, customer) => sum + Number(customer.orderCount || 0), 0);
  useEffect(() => setPage(1), [query, sort, tab]);

  const columns = [
    {
      key: "customer",
      label: "Customer",
      render: (customer) => <span className="ops2-customer-cell"><Avatar name={customer.name} src={customer.avatar} /><span><strong>{customer.name}</strong><small>{customerTier(customer).replace("-", " ")}</small></span></span>,
    },
    {
      key: "contact",
      label: "Contact",
      render: (customer) => <span className="ops2-primary-cell"><strong>{customer.email}</strong><small>{customer.phone || "No phone"}</small></span>,
    },
    { key: "orderCount", label: "Orders", render: (customer) => <strong>{customer.orderCount || 0}</strong> },
    { key: "lifetimeValue", label: "Lifetime value", render: (customer) => <strong>{money(customer.lifetimeValue)}</strong> },
    { key: "createdAt", label: "Joined", render: (customer) => formatDate(customer.createdAt) },
    { key: "actions", label: "", width: 54, render: (customer) => <IconButton label={`View ${customer.name}`} onClick={(event) => { event.stopPropagation(); setSelected(customer); }}><Eye /></IconButton> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Customer relationships"
        title="Customers"
        description="Review account activity, segment customer value, and access contact details from a focused relationship workspace."
      />

      <section className="ops2-metrics" aria-label="Customer metrics">
        <MetricCard label="Customer accounts" value={customers.length} detail={`${counts.repeat + counts["high-value"]} repeat buyers`} icon={<UsersThree />} />
        <MetricCard label="Lifetime value" value={money(lifetimeValue)} detail="Across registered customers" icon={<Star />} tone="success" />
        <MetricCard label="Recorded orders" value={totalOrders} detail="Customer account history" icon={<UserPlus />} tone="info" />
        <MetricCard label="High-value customers" value={counts["high-value"]} detail="Lifetime value above Tk 100,000" icon={<Star />} tone="warning" />
      </section>

      <Card className="ops2-work-card" padding="none">
        <div className="ops2-tabs-wrap">
          <Tabs value={tab} onChange={setTab} label="Customer segments" items={[
            { value: "all", label: "All", count: counts.all },
            { value: "new", label: "New", count: counts.new },
            { value: "repeat", label: "Repeat", count: counts.repeat },
            { value: "high-value", label: "High value", count: counts["high-value"] },
          ]} />
        </div>
        <Toolbar>
          <SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or phone" label="Search customers" />
          <SortSelect value={sort} onChange={(event) => setSort(event.target.value)} options={[
            { value: "value-high", label: "Highest lifetime value" },
            { value: "orders-high", label: "Most orders" },
            { value: "newest", label: "Newest accounts" },
            { value: "oldest", label: "Oldest accounts" },
            { value: "name", label: "Name A–Z" },
            { value: "name-desc", label: "Name Z–A" },
          ]} />
          <span className="ops2-result-count">{filtered.length} accounts</span>
        </Toolbar>
        <DataTable columns={columns} rows={visible} caption="Administrator customer list" onRowClick={setSelected} />
        <div className="ops2-card-footer"><span>Showing {visible.length} of {filtered.length}</span><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>
      </Card>

      <Drawer
        open={Boolean(selected)}
        title={selected?.name || "Customer details"}
        description="Account profile and customer value"
        onClose={() => setSelected(null)}
        footer={<Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>}
      >
        {selected && <div className="ops2-detail-stack">
          <div className="ops2-customer-hero"><Avatar name={selected.name} src={selected.avatar} size="lg" /><div><h3>{selected.name}</h3><span>{customerTier(selected).replace("-", " ")} customer</span></div></div>
          <div className="ops2-contact-actions">
            <a className="ui-button ui-button--secondary ui-button--md" href={`mailto:${selected.email}`}><Envelope /><span>Email customer</span></a>
            {selected.phone && <a className="ui-button ui-button--secondary ui-button--md" href={`tel:${selected.phone}`}><Phone /><span>Call customer</span></a>}
          </div>
          <DetailList items={[
            { label: "Email", value: selected.email, wide: true },
            { label: "Phone", value: selected.phone || "Not provided" },
            { label: "Orders", value: selected.orderCount || 0 },
            { label: "Lifetime value", value: money(selected.lifetimeValue) },
            { label: "Joined", value: formatDate(selected.createdAt) },
          ]} />
        </div>}
      </Drawer>
    </>
  );
}
