import React, { useEffect, useId, useRef } from "react";
import {
  ArrowClockwise,
  CaretDown,
  CheckCircle,
  Info,
  Warning,
  X,
} from "@phosphor-icons/react";
import { Badge, Button, Card, IconButton, Select, cx } from "../ui/index.jsx";

const TONE_BY_STATUS = {
  active: "success",
  available: "success",
  confirmed: "info",
  delivered: "success",
  disabled: "neutral",
  hidden: "neutral",
  in_stock: "success",
  ok: "success",
  paid: "success",
  paused: "warning",
  pending: "warning",
  preorder: "info",
  processing: "info",
  shipped: "info",
  cancelled: "danger",
  failed: "danger",
  out_of_stock: "danger",
};

export function humanize(value = "") {
  return String(value || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function StatusBadge({ value, tone }) {
  return <Badge tone={tone || TONE_BY_STATUS[String(value).toLowerCase()] || "neutral"}>{humanize(value)}</Badge>;
}

export function MetricCard({ label, value, detail, icon, tone = "primary" }) {
  return (
    <Card className={cx("ops2-metric", `ops2-metric--${tone}`)} padding="md">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
      <i aria-hidden="true">{icon}</i>
    </Card>
  );
}

export function Toolbar({ children, className }) {
  return <div className={cx("ops2-toolbar", className)}>{children}</div>;
}

export function BulkBar({ count, children, onClear }) {
  if (!count) return null;
  return (
    <div className="ops2-bulk" role="region" aria-label="Bulk actions">
      <strong>{count} selected</strong>
      <div>{children}</div>
      <Button variant="ghost" size="sm" onClick={onClear}>Clear selection</Button>
    </div>
  );
}

export function SortSelect({ value, onChange, options, label = "Sort records" }) {
  return (
    <label className="ops2-compact-field">
      <span className="sr-only">{label}</span>
      <Select value={value} onChange={onChange} aria-label={label}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
    </label>
  );
}

export function Drawer({ open, title, description, onClose, children, footer, size = "md" }) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.classList.add("ops2-lock");
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      document.body.classList.remove("ops2-lock");
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="ops2-drawer-layer">
      <button className="ops2-drawer-backdrop" aria-label={`Close ${title}`} onClick={onClose} />
      <aside
        ref={panelRef}
        className={cx("ops2-drawer", `ops2-drawer--${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex="-1"
      >
        <header>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <IconButton label={`Close ${title}`} onClick={onClose}><X /></IconButton>
        </header>
        <div className="ops2-drawer-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </aside>
    </div>
  );
}

export function DetailList({ items }) {
  return (
    <dl className="ops2-detail-list">
      {items.filter((item) => item.value !== undefined && item.value !== null && item.value !== "").map((item) => (
        <div key={item.label} className={item.wide ? "wide" : ""}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function InlineNotice({ tone = "info", children, action }) {
  const Icon = tone === "error" ? Warning : tone === "success" ? CheckCircle : Info;
  return (
    <div className={cx("ops2-notice", `ops2-notice--${tone}`)} role={tone === "error" ? "alert" : "status"}>
      <Icon weight="fill" aria-hidden="true" />
      <span>{children}</span>
      {action}
    </div>
  );
}

export function LoadingPanel({ label = "Loading operations workspace" }) {
  return (
    <Card className="ops2-loading" padding="lg" role="status">
      <ArrowClockwise className="ui-spin" aria-hidden="true" />
      <strong>{label}</strong>
      <span>Preparing current store data and controls.</span>
    </Card>
  );
}

export function Disclosure({ title, children, defaultOpen = false }) {
  return (
    <details className="ops2-disclosure" open={defaultOpen}>
      <summary>{title}<CaretDown aria-hidden="true" /></summary>
      <div>{children}</div>
    </details>
  );
}
