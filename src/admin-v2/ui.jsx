import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CheckCircle,
  DotsThree,
  File,
  MagnifyingGlass,
  SpinnerGap,
  UploadSimple,
  Warning,
  X,
} from "@phosphor-icons/react";

export function cx(...values) {
  return values
    .flatMap((value) => {
      if (!value) return [];
      if (typeof value === "string") return [value];
      if (Array.isArray(value)) return value;
      if (typeof value === "object") {
        return Object.entries(value)
          .filter(([, enabled]) => Boolean(enabled))
          .map(([key]) => key);
      }
      return [];
    })
    .filter(Boolean)
    .join(" ");
}

export const Button = forwardRef(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    className,
    type = "button",
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx("a-button", `a-button-${variant}`, `a-button-${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <SpinnerGap className="a-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export function IconButton({ label, variant = "default", className, children, ...props }) {
  return (
    <button
      type="button"
      className={cx("a-icon-button", `a-icon-button-${variant}`, className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({ tone = "neutral", children, className }) {
  return <span className={cx("a-badge", `a-badge-${tone}`, className)}>{children}</span>;
}

export function Avatar({ name = "Administrator", src, size = "md", status, className }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span className={cx("a-avatar", `a-avatar-${size}`, className)} aria-label={name}>
      {src ? <img src={src} alt="" /> : <span>{initials || "A"}</span>}
      {status && <i className={`a-avatar-status ${status}`} aria-hidden="true" />}
    </span>
  );
}

export function Card({ className, children, interactive = false, ...props }) {
  return (
    <section className={cx("a-card", interactive && "a-card-interactive", className)} {...props}>
      {children}
    </section>
  );
}

export function CardHeader({ eyebrow, title, description, icon: Icon, action, className }) {
  return (
    <header className={cx("a-card-header", className)}>
      <div className="a-card-heading">
        {Icon && <span className="a-card-icon"><Icon weight="duotone" /></span>}
        <div>
          {eyebrow && <span className="a-eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {action && <div className="a-card-action">{action}</div>}
    </header>
  );
}

export function CardBody({ className, children }) {
  return <div className={cx("a-card-body", className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return <footer className={cx("a-card-footer", className)}>{children}</footer>;
}

export function PageHeader({ eyebrow, title, description, actions, breadcrumbs, meta }) {
  return (
    <header className="a-page-header">
      <div className="a-page-header-copy">
        {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
        {eyebrow && <span className="a-eyebrow">{eyebrow}</span>}
        <div className="a-page-title-line">
          <h1>{title}</h1>
          {meta}
        </div>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="a-page-actions">{actions}</div>}
    </header>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav className="a-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {index > 0 && <CaretRight aria-hidden="true" />}
            {item.onClick ? <button type="button" onClick={item.onClick}>{item.label}</button> : <span>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Field({ label, hint, error, required, className, children }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const control = React.isValidElement(children)
    ? React.cloneElement(children, {
        id: children.props.id || id,
        "aria-describedby": children.props["aria-describedby"] || describedBy,
        "aria-invalid": Boolean(error) || undefined,
        required: children.props.required ?? required,
      })
    : children;
  return (
    <label className={cx("a-field", className)} htmlFor={id}>
      <span className="a-field-label">{label}{required && <b aria-hidden="true"> *</b>}</span>
      {control}
      {error ? <small id={`${id}-error`} className="error">{error}</small> : hint ? <small id={`${id}-hint`}>{hint}</small> : null}
    </label>
  );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cx("a-input", className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cx("a-textarea", className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <span className="a-select-wrap">
      <select ref={ref} className={cx("a-select", className)} {...props}>{children}</select>
      <CaretDown aria-hidden="true" />
    </span>
  );
});

export function SearchInput({ value, onChange, placeholder = "Search", className, ...props }) {
  return (
    <label className={cx("a-search", className)}>
      <MagnifyingGlass aria-hidden="true" />
      <Input value={value} onChange={onChange} placeholder={placeholder} type="search" {...props} />
    </label>
  );
}

export function Switch({ checked, onCheckedChange, label, description, disabled = false }) {
  return (
    <div className={cx("a-switch-row", disabled && "disabled")}>
      <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
      <button
        type="button"
        className={cx("a-switch", checked && "checked")}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
      ><i /></button>
    </div>
  );
}

export function Tabs({ value, onChange, items, label = "Page sections" }) {
  return (
    <div className="a-tabs" role="tablist" aria-label={label}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            type="button"
            key={item.value}
            role="tab"
            aria-selected={value === item.value}
            className={value === item.value ? "active" : ""}
            onClick={() => onChange(item.value)}
          >
            {Icon && <Icon />}
            <span>{item.label}</span>
            {item.count != null && <Badge>{item.count}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedControl({ value, onChange, items, label }) {
  return (
    <div className="a-segmented" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          type="button"
          key={item.value}
          aria-pressed={value === item.value}
          className={value === item.value ? "active" : ""}
          onClick={() => onChange(item.value)}
        >{item.icon && <item.icon />}{item.label}</button>
      ))}
    </div>
  );
}

export function Toolbar({ leading, trailing, className }) {
  return <div className={cx("a-toolbar", className)}><div>{leading}</div><div>{trailing}</div></div>;
}

export function Collapsible({ title, description, icon: Icon, defaultOpen = true, children, className }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cx("a-collapsible", className)}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span>{Icon && <Icon />}{title}</span>
        <span>{description}</span>
        <CaretDown className={open ? "open" : ""} />
      </button>
      {open && <div className="a-collapsible-content">{children}</div>}
    </section>
  );
}

export function Progress({ value = 0, label, tone = "primary" }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="a-progress" aria-label={label}>
      <span><i className={`tone-${tone}`} style={{ width: `${safe}%` }} /></span>
      {label && <small>{label}</small>}
    </div>
  );
}

export function Sparkline({ values = [], label = "Trend", tone = "primary" }) {
  const points = useMemo(() => {
    if (!values.length) return "";
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(1, max - min);
    return values.map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 36 - ((value - min) / range) * 32;
      return `${x},${y}`;
    }).join(" ");
  }, [values]);
  return (
    <svg className={cx("a-sparkline", `tone-${tone}`)} viewBox="0 0 100 40" role="img" aria-label={label} preserveAspectRatio="none">
      <polyline points={points} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatCard({ label, value, detail, icon: Icon, trend, trendLabel, tone = "primary", onClick }) {
  const content = (
    <>
      <div className="a-stat-top"><span className={`a-stat-icon tone-${tone}`}>{Icon && <Icon weight="duotone" />}</span>{trendLabel && <Badge tone={trend >= 0 ? "success" : "danger"}>{trend >= 0 ? "+" : ""}{trend}%</Badge>}</div>
      <div className="a-stat-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </>
  );
  return onClick ? <button type="button" className="a-stat-card" onClick={onClick}>{content}</button> : <Card className="a-stat-card">{content}</Card>;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="a-empty">
      {Icon && <span><Icon weight="duotone" /></span>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ height = 16, width = "100%", className }) {
  return <span className={cx("a-skeleton", className)} style={{ height, width }} aria-hidden="true" />;
}

export function LoadingScreen({ label = "Loading administrator workspace" }) {
  return <main className="a-loading" role="status"><SpinnerGap className="a-spin" /><strong>{label}</strong></main>;
}

function useEscape(callback, active) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (event) => event.key === "Escape" && callback();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [callback, active]);
}

function Overlay({ open, onClose, title, description, children, mode = "dialog", size = "md", footer }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEscape(onClose, open);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    document.body.classList.add("a-overlay-lock");
    const timer = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove("a-overlay-lock");
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className={cx("a-overlay", `a-overlay-${mode}`)}>
      <button className="a-overlay-backdrop" aria-label={`Close ${title}`} onClick={onClose} />
      <section
        ref={panelRef}
        tabIndex={-1}
        className={cx("a-overlay-panel", `a-overlay-${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <header>
          <div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
          <IconButton label={`Close ${title}`} onClick={onClose}><X /></IconButton>
        </header>
        <div className="a-overlay-body">{children}</div>
        {footer && <footer className="a-overlay-footer">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}

export function Dialog(props) { return <Overlay mode="dialog" {...props} />; }
export function Drawer(props) { return <Overlay mode="drawer" {...props} />; }

export function DropdownMenu({ trigger, items, align = "end" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  useEscape(() => setOpen(false), open);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <div className="a-dropdown" ref={rootRef}>
      <span onClick={() => setOpen((value) => !value)}>{trigger}</span>
      {open && <div className={cx("a-dropdown-menu", `align-${align}`)} role="menu">
        {items.map((item, index) => item.separator
          ? <hr key={`separator-${index}`} />
          : <button
              type="button"
              key={item.label}
              role="menuitem"
              className={item.danger ? "danger" : ""}
              disabled={item.disabled}
              onClick={() => { setOpen(false); item.onClick?.(); }}
            >{item.icon && <item.icon />}{item.label}{item.shortcut && <kbd>{item.shortcut}</kbd>}</button>)}
      </div>}
    </div>
  );
}

function valueFrom(row, column) {
  if (column.accessor) return column.accessor(row);
  return row[column.key];
}

export function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  onRowClick,
  empty,
  loading = false,
  selectable = false,
  selected = [],
  onSelectionChange,
  initialSort,
  pageSize = 10,
  density = "comfortable",
  caption,
}) {
  const [sort, setSort] = useState(initialSort || null);
  const [page, setPage] = useState(1);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return rows;
    return [...rows].sort((left, right) => {
      const a = valueFrom(left, column);
      const b = valueFrom(right, column);
      const result = typeof a === "number" && typeof b === "number"
        ? a - b
        : String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
      return sort.direction === "asc" ? result : -result;
    });
  }, [columns, rows, sort]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => setPage(1), [rows, pageSize]);

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selected.includes(rowKey(row)));
  const toggleAll = () => {
    const ids = visibleRows.map(rowKey);
    onSelectionChange?.(allVisibleSelected ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  };
  const toggleOne = (id) => onSelectionChange?.(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  const toggleSort = (column) => {
    if (!column.sortable) return;
    setSort((current) => current?.key === column.key
      ? { key: column.key, direction: current.direction === "asc" ? "desc" : "asc" }
      : { key: column.key, direction: "asc" });
  };

  if (loading) return <div className="a-table-loading">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} height={54} />)}</div>;
  if (!rows.length) return empty || <EmptyState title="No records" description="No data is available for this view." />;

  return (
    <div className={cx("a-data-table", `density-${density}`)}>
      <div className="a-table-scroll">
        <table>
          {caption && <caption>{caption}</caption>}
          <thead><tr>
            {selectable && <th className="select-cell"><input type="checkbox" aria-label="Select visible rows" checked={allVisibleSelected} onChange={toggleAll} /></th>}
            {columns.map((column) => (
              <th key={column.key} style={column.width ? { width: column.width } : undefined} aria-sort={sort?.key === column.key ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}>
                <button type="button" disabled={!column.sortable} onClick={() => toggleSort(column)}>{column.label}{column.sortable && <CaretDown className={sort?.key === column.key ? sort.direction : ""} />}</button>
              </th>
            ))}
          </tr></thead>
          <tbody>{visibleRows.map((row) => {
            const key = rowKey(row);
            return <tr key={key} className={cx(onRowClick && "clickable", selected.includes(key) && "selected")}>
              {selectable && <td className="select-cell"><input type="checkbox" aria-label={`Select row ${key}`} checked={selected.includes(key)} onChange={() => toggleOne(key)} onClick={(event) => event.stopPropagation()} /></td>}
              {columns.map((column) => <td key={column.key} data-label={column.label} onClick={() => onRowClick?.(row)}>{column.render ? column.render(row) : valueFrom(row, column)}</td>)}
            </tr>;
          })}</tbody>
        </table>
      </div>
      <Pagination page={currentPage} pageCount={pageCount} total={sorted.length} pageSize={pageSize} onChange={setPage} />
    </div>
  );
}

export function Pagination({ page, pageCount, total, pageSize, onChange }) {
  if (pageCount <= 1) return <div className="a-pagination single"><span>{total} records</span></div>;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <div className="a-pagination">
      <span>Showing {first}–{last} of {total}</span>
      <div>
        <IconButton label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><CaretLeft /></IconButton>
        <span>Page {page} of {pageCount}</span>
        <IconButton label="Next page" disabled={page >= pageCount} onClick={() => onChange(page + 1)}><CaretRight /></IconButton>
      </div>
    </div>
  );
}

export function DetailList({ items }) {
  return <dl className="a-detail-list">{items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value ?? "—"}</dd></div>)}</dl>;
}

export function FileDropzone({ files = [], onFiles, accept = "image/*,video/*", multiple = false, maxSizeMb = 20, title = "Upload attachments", description = "Drag files here or browse your device" }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const choose = (list) => {
    const next = Array.from(list || []);
    const maxBytes = maxSizeMb * 1024 * 1024;
    onFiles?.(next.filter((file) => file.size <= maxBytes));
  };
  return (
    <div className="a-upload-control">
      <button
        type="button"
        className={cx("a-dropzone", dragging && "dragging")}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}
      >
        <span><UploadSimple weight="duotone" /></span>
        <strong>{title}</strong>
        <small>{description} · Maximum {maxSizeMb} MB</small>
      </button>
      <input ref={inputRef} hidden type="file" accept={accept} multiple={multiple} onChange={(event) => choose(event.target.files)} />
      {files.length > 0 && <ul className="a-file-list">{files.map((file) => <li key={`${file.name}-${file.lastModified}`}><File /><span><strong>{file.name}</strong><small>{Math.ceil(file.size / 1024)} KB</small></span><CheckCircle weight="fill" /></li>)}</ul>}
    </div>
  );
}

const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = "success") => {
    const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setItems((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 5000);
  }, []);
  const dismiss = useCallback((id) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="a-toasts" aria-live="polite" aria-atomic="false">
        {items.map((item) => <div key={item.id} className={cx("a-toast", `tone-${item.tone}`)}>{item.tone === "error" ? <Warning weight="fill" /> : <CheckCircle weight="fill" />}<span>{item.message}</span><IconButton label="Dismiss notification" onClick={() => dismiss(item.id)}><X /></IconButton></div>)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context.push;
}

export function MoreMenu({ items }) {
  return <DropdownMenu trigger={<IconButton label="More actions"><DotsThree weight="bold" /></IconButton>} items={items} />;
}

export function PermissionGate({ permissions, permission, children, fallback = null }) {
  return permissions?.includes("*") || permissions?.includes(permission) ? children : fallback;
}
