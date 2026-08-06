import React, { useId, useMemo, useRef, useState } from "react";
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  CloudArrowUp,
  DotsThree,
  MagnifyingGlass,
  Paperclip,
  SpinnerGap,
  X,
} from "@phosphor-icons/react";

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function Button({ children, variant = "primary", size = "md", loading = false, className, ...props }) {
  return (
    <button className={cx("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className)} disabled={loading || props.disabled} {...props}>
      {loading && <SpinnerGap className="ui-spin" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

export function IconButton({ label, children, variant = "ghost", className, ...props }) {
  return <button className={cx("ui-icon-button", `ui-icon-button--${variant}`, className)} aria-label={label} title={label} {...props}>{children}</button>;
}

export function Card({ children, className, padding = "md", ...props }) {
  return <section className={cx("ui-card", `ui-card--${padding}`, className)} {...props}>{children}</section>;
}

export function PageHeader({ eyebrow, title, description, actions, breadcrumbs = [] }) {
  return (
    <header className="ui-page-header">
      <div>
        {breadcrumbs.length > 0 && <nav aria-label="Breadcrumb" className="ui-breadcrumbs">{breadcrumbs.map((item, index) => <React.Fragment key={item.label}><span>{item.label}</span>{index < breadcrumbs.length - 1 && <CaretRight aria-hidden="true" />}</React.Fragment>)}</nav>}
        {eyebrow && <span className="ui-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="ui-page-actions">{actions}</div>}
    </header>
  );
}

export function Field({ label, hint, error, required, children, className }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const child = React.isValidElement(children) ? React.cloneElement(children, {
    id: children.props.id || id,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy,
  }) : children;
  return (
    <label className={cx("ui-field", className)} htmlFor={children?.props?.id || id}>
      <span className="ui-field__label">{label}{required && <b aria-hidden="true">*</b>}</span>
      {child}
      {hint && !error && <small id={`${id}-hint`}>{hint}</small>}
      {error && <small id={`${id}-error`} className="ui-field__error" role="alert">{error}</small>}
    </label>
  );
}

export function SearchField({ value, onChange, placeholder = "Search", label = "Search", className }) {
  return <label className={cx("ui-search", className)}><MagnifyingGlass aria-hidden="true" /><input value={value} onChange={onChange} placeholder={placeholder} aria-label={label} /></label>;
}

export function Select({ children, className, ...props }) {
  return <div className={cx("ui-select", className)}><select {...props}>{children}</select><CaretDown aria-hidden="true" /></div>;
}

export function Badge({ children, tone = "neutral", className }) {
  return <span className={cx("ui-badge", `ui-badge--${tone}`, className)}>{children}</span>;
}

export function Avatar({ name = "User", src, size = "md", className }) {
  const initials = useMemo(() => name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase(), [name]);
  return <span className={cx("ui-avatar", `ui-avatar--${size}`, className)}>{src ? <img src={src} alt={name} /> : <span aria-hidden="true">{initials || "U"}</span>}</span>;
}

export function Tabs({ items, value, onChange, label = "View options" }) {
  return <div className="ui-tabs" role="tablist" aria-label={label}>{items.map((item) => <button key={item.value} role="tab" aria-selected={value === item.value} className={value === item.value ? "active" : ""} onClick={() => onChange(item.value)}>{item.icon}{item.label}{item.count !== undefined && <Badge>{item.count}</Badge>}</button>)}</div>;
}

export function Menu({ trigger, items, align = "end" }) {
  const [open, setOpen] = useState(false);
  return <div className="ui-menu"><button className="ui-menu__trigger" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>{trigger || <DotsThree />}</button>{open && <div className={cx("ui-menu__panel", `ui-menu__panel--${align}`)} role="menu">{items.map((item) => <button key={item.label} role="menuitem" className={item.danger ? "danger" : ""} onClick={() => { setOpen(false); item.onSelect?.(); }}>{item.icon}<span>{item.label}</span></button>)}</div>}</div>;
}

export function EmptyState({ icon, title, description, action }) {
  return <div className="ui-empty">{icon}<h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function Skeleton({ lines = 3, className }) {
  return <div className={cx("ui-skeleton", className)} aria-hidden="true">{Array.from({ length: lines }, (_, index) => <span key={index} />)}</div>;
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return <nav className="ui-pagination" aria-label="Pagination"><IconButton label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><CaretLeft /></IconButton><span>Page <b>{page}</b> of {totalPages}</span><IconButton label="Next page" disabled={page >= totalPages} onClick={() => onChange(page + 1)}><CaretRight /></IconButton></nav>;
}

export function FileDropzone({ accept, multiple = false, maxSizeMb = 10, value = [], onChange, label = "Upload attachments" }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const processFiles = (list) => {
    const files = Array.from(list || []);
    const oversized = files.find((file) => file.size > maxSizeMb * 1024 * 1024);
    if (oversized) return setError(`${oversized.name} exceeds ${maxSizeMb} MB.`);
    setError("");
    onChange?.(multiple ? [...value, ...files] : files.slice(0, 1));
  };
  return <div className="ui-upload"><div className={cx("ui-dropzone", dragging && "is-dragging")} role="button" tabIndex="0" onKeyDown={(event) => { if (["Enter", " "].includes(event.key)) inputRef.current?.click(); }} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); processFiles(event.dataTransfer.files); }}><input ref={inputRef} hidden type="file" accept={accept} multiple={multiple} onChange={(event) => processFiles(event.target.files)} /><CloudArrowUp weight="duotone" /><strong>{label}</strong><span>Drag files here or browse your device</span><small>Maximum {maxSizeMb} MB per file</small></div>{error && <p className="ui-upload__error" role="alert">{error}</p>}{value.length > 0 && <ul className="ui-file-list">{value.map((file, index) => <li key={`${file.name}-${index}`}><Paperclip /><span><strong>{file.name}</strong><small>{Math.ceil(file.size / 1024)} KB</small></span><IconButton label={`Remove ${file.name}`} onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}><X /></IconButton></li>)}</ul>}</div>;
}

export function DataTable({ columns, rows, rowKey = "id", onRowClick, empty, caption = "Data table" }) {
  return <div className="ui-table-wrap"><table className="ui-table"><caption className="sr-only">{caption}</caption><thead><tr>{columns.map((column) => <th key={column.key} scope="col" style={{ width: column.width }}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={typeof rowKey === "function" ? rowKey(row) : row[rowKey]} tabIndex={onRowClick ? 0 : undefined} onClick={() => onRowClick?.(row)} onKeyDown={(event) => { if (onRowClick && ["Enter", " "].includes(event.key)) onRowClick(row); }}>{columns.map((column) => <td key={column.key} data-label={column.label}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody></table>{rows.length === 0 && (empty || <EmptyState title="No records found" description="Try changing your search or filters." />)}</div>;
}

export function ToastRegion({ items = [], onDismiss }) {
  return <div className="ui-toast-region" aria-live="polite" aria-atomic="true">{items.map((item) => <div key={item.id} className={cx("ui-toast", `ui-toast--${item.tone || "info"}`)}><Check aria-hidden="true" /><span>{item.message}</span><IconButton label="Dismiss notification" onClick={() => onDismiss?.(item.id)}><X /></IconButton></div>)}</div>;
}
