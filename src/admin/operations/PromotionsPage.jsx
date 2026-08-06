import { useMemo, useState } from "react";
import {
  CalendarBlank,
  PencilSimple,
  Plus,
  Tag,
  Ticket,
} from "@phosphor-icons/react";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  IconButton,
  PageHeader,
  SearchField,
  Select,
  Tabs,
} from "../ui/index.jsx";
import { formatDate, money } from "../../shared/client.js";
import { DetailList, Drawer, SortSelect, StatusBadge } from "./components.jsx";

const EMPTY_COUPON = {
  code: "",
  discountType: "percent",
  discountValue: "10",
  minimumOrder: "0",
  usageLimit: "",
  startsAt: "",
  expiresAt: "",
  active: true,
};

function toDraft(coupon) {
  if (!coupon) return { ...EMPTY_COUPON };
  return {
    ...coupon,
    discountValue: String(coupon.discountValue ?? ""),
    minimumOrder: String(coupon.minimumOrder ?? 0),
    usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
    startsAt: coupon.startsAt ? String(coupon.startsAt).slice(0, 16) : "",
    expiresAt: coupon.expiresAt ? String(coupon.expiresAt).slice(0, 16) : "",
  };
}

export function PromotionsPage({ coupons = [], onSaveCoupon }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState(null);
  const [draft, setDraft] = useState(EMPTY_COUPON);
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => ({
    all: coupons.length,
    active: coupons.filter((coupon) => coupon.active).length,
    paused: coupons.filter((coupon) => !coupon.active).length,
  }), [coupons]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = coupons.filter((coupon) => {
      const matchesTab = tab === "all" || (tab === "active" ? coupon.active : !coupon.active);
      const matchesQuery = !normalized || `${coupon.code} ${coupon.discountType}`.toLowerCase().includes(normalized);
      return matchesTab && matchesQuery;
    });
    return [...filtered].sort((left, right) => {
      if (sort === "code") return left.code.localeCompare(right.code);
      if (sort === "usage") return Number(right.usedCount || 0) - Number(left.usedCount || 0);
      if (sort === "expiry") return String(left.expiresAt || "9999").localeCompare(String(right.expiresAt || "9999"));
      return Number(right.id || 0) - Number(left.id || 0);
    });
  }, [coupons, query, sort, tab]);

  const openCreate = () => {
    setSelected(null);
    setDraft({ ...EMPTY_COUPON });
    setMode("edit");
  };

  const openDetails = (coupon) => {
    setSelected(coupon);
    setDraft(toDraft(coupon));
    setMode("details");
  };

  const openEdit = (coupon) => {
    setSelected(coupon);
    setDraft(toDraft(coupon));
    setMode("edit");
  };

  const close = () => {
    setMode(null);
    setSelected(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await onSaveCoupon(selected?.id, {
        ...draft,
        code: draft.code.trim().toUpperCase(),
        discountValue: Number(draft.discountValue),
        minimumOrder: Number(draft.minimumOrder || 0),
        usageLimit: draft.usageLimit ? Number(draft.usageLimit) : null,
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
        expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
      });
      setSelected(saved);
      setDraft(toDraft(saved));
      setMode("details");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon) => {
    const saved = await onSaveCoupon(coupon.id, { active: !coupon.active });
    setSelected(saved);
    setDraft(toDraft(saved));
  };

  const columns = [
    {
      key: "code",
      label: "Campaign",
      render: (coupon) => <span className="ops3-record"><strong>{coupon.code}</strong><small>{coupon.discountType === "percent" ? `${coupon.discountValue}% discount` : `${money(coupon.discountValue)} discount`}</small></span>,
    },
    { key: "minimumOrder", label: "Minimum order", render: (coupon) => money(coupon.minimumOrder || 0) },
    { key: "usage", label: "Usage", render: (coupon) => <span><strong>{coupon.usedCount || 0}</strong>{coupon.usageLimit ? ` / ${coupon.usageLimit}` : " uses"}</span> },
    { key: "expiresAt", label: "Expiry", render: (coupon) => coupon.expiresAt ? formatDate(coupon.expiresAt) : "No expiry" },
    { key: "active", label: "Status", render: (coupon) => <StatusBadge value={coupon.active ? "active" : "paused"} /> },
    {
      key: "actions",
      label: "",
      width: "52px",
      render: (coupon) => <IconButton label={`Edit ${coupon.code}`} onClick={(event) => { event.stopPropagation(); openEdit(coupon); }}><PencilSimple /></IconButton>,
    },
  ];

  return (
    <div className="ops3-page">
      <PageHeader
        eyebrow="Campaign management"
        title="Promotions"
        description="Create, schedule, review and pause customer coupon campaigns from one controlled workflow."
        actions={<Button onClick={openCreate}><Plus /> New coupon</Button>}
      />

      <section className="ops3-summary-strip" aria-label="Promotion summary">
        <Card padding="md"><Tag /><span><strong>{counts.active}</strong><small>Active campaigns</small></span></Card>
        <Card padding="md"><Ticket /><span><strong>{coupons.reduce((sum, coupon) => sum + Number(coupon.usedCount || 0), 0)}</strong><small>Total coupon uses</small></span></Card>
        <Card padding="md"><CalendarBlank /><span><strong>{coupons.filter((coupon) => coupon.expiresAt).length}</strong><small>Scheduled expirations</small></span></Card>
      </section>

      <Card className="ops3-table-card" padding="none">
        <div className="ops3-table-toolbar">
          <Tabs
            value={tab}
            onChange={setTab}
            label="Promotion status"
            items={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active },
              { value: "paused", label: "Paused", count: counts.paused },
            ]}
          />
          <div>
            <SearchField value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search coupon codes" label="Search promotions" />
            <SortSelect
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              options={[
                { value: "recent", label: "Recently created" },
                { value: "code", label: "Coupon code" },
                { value: "usage", label: "Most used" },
                { value: "expiry", label: "Expiring first" },
              ]}
            />
          </div>
        </div>
        <DataTable
          caption="Store promotion campaigns"
          columns={columns}
          rows={visible}
          onRowClick={openDetails}
          empty={<EmptyState icon={<Tag weight="duotone" />} title="No promotions found" description="Create a coupon or adjust the current search and status filters." action={<Button onClick={openCreate}>Create coupon</Button>} />}
        />
      </Card>

      <Drawer
        open={Boolean(mode)}
        title={mode === "edit" ? (selected ? `Edit ${selected.code}` : "Create coupon") : selected?.code || "Coupon details"}
        description={mode === "edit" ? "Configure campaign rules, availability and usage controls." : "Review campaign performance and current availability."}
        onClose={close}
        size="lg"
        footer={mode === "details" && selected ? <>
          <Button variant="secondary" onClick={() => toggleActive(selected)}>{selected.active ? "Pause campaign" : "Activate campaign"}</Button>
          <Button onClick={() => openEdit(selected)}><PencilSimple /> Edit campaign</Button>
        </> : undefined}
      >
        {mode === "details" && selected ? (
          <div className="ops3-detail-stack">
            <div className="ops3-coupon-hero"><Tag weight="duotone" /><div><StatusBadge value={selected.active ? "active" : "paused"} /><h3>{selected.code}</h3><p>{selected.discountType === "percent" ? `${selected.discountValue}% off qualifying orders` : `${money(selected.discountValue)} off qualifying orders`}</p></div></div>
            <DetailList items={[
              { label: "Minimum order", value: money(selected.minimumOrder || 0) },
              { label: "Usage", value: `${selected.usedCount || 0}${selected.usageLimit ? ` of ${selected.usageLimit}` : " uses"}` },
              { label: "Starts", value: selected.startsAt ? formatDate(selected.startsAt) : "Immediately" },
              { label: "Expires", value: selected.expiresAt ? formatDate(selected.expiresAt) : "No expiry" },
            ]} />
          </div>
        ) : (
          <form className="ops3-form" onSubmit={submit}>
            <div className="ops3-form-grid">
              <Field label="Coupon code" required hint="Use a short code customers can enter at checkout."><input required value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.toUpperCase() })} /></Field>
              <Field label="Discount type" required><Select value={draft.discountType} onChange={(event) => setDraft({ ...draft, discountType: event.target.value })}><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></Select></Field>
              <Field label="Discount value" required><input required type="number" min="1" value={draft.discountValue} onChange={(event) => setDraft({ ...draft, discountValue: event.target.value })} /></Field>
              <Field label="Minimum order"><input type="number" min="0" value={draft.minimumOrder} onChange={(event) => setDraft({ ...draft, minimumOrder: event.target.value })} /></Field>
              <Field label="Usage limit" hint="Leave empty for unlimited use."><input type="number" min="1" value={draft.usageLimit} onChange={(event) => setDraft({ ...draft, usageLimit: event.target.value })} /></Field>
              <Field label="Starts at"><input type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} /></Field>
              <Field label="Expires at"><input type="datetime-local" value={draft.expiresAt} onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })} /></Field>
            </div>
            <label className="ops3-check"><input type="checkbox" checked={Boolean(draft.active)} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /><span><strong>Campaign active</strong><small>Customers can use this coupon when all other rules are satisfied.</small></span></label>
            <div className="ops3-form-actions"><Button type="button" variant="secondary" onClick={close}>Cancel</Button><Button loading={saving}>{selected ? "Save changes" : "Create coupon"}</Button></div>
          </form>
        )}
      </Drawer>
    </div>
  );
}
