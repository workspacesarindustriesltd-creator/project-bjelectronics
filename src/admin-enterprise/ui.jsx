import React, { createContext, forwardRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, CaretDown, MagnifyingGlass, SpinnerGap, Warning, X } from "@phosphor-icons/react";

export function cn(...values) {
  return values.flatMap((value) => {
    if (!value) return [];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value;
    if (typeof value === "object") return Object.entries(value).filter(([, enabled]) => enabled).map(([key]) => key);
    return [];
  }).filter(Boolean).join(" ");
}

export const Button = forwardRef(function Button({ variant = "default", size = "default", loading = false, className, children, ...props }, ref) {
  return <button ref={ref} className={cn("ui-button", `ui-button-${variant}`, `ui-button-${size}`, className)} disabled={loading || props.disabled} {...props}>
    {loading && <SpinnerGap className="ui-spin" aria-hidden="true" />}
    {children}
  </button>;
});

export function IconButton({ label, className, children, ...props }) {
  return <button className={cn("ui-icon-button", className)} aria-label={label} title={label} {...props}>{children}</button>;
}

export function Card({ className, children, ...props }) {
  return <section className={cn("ui-card", className)} {...props}>{children}</section>;
}
export function CardHeader({ eyebrow, title, description, action, icon: Icon }) {
  return <header className="ui-card-header"><div className="ui-card-heading">{Icon && <span className="ui-card-icon"><Icon weight="duotone" /></span>}<div>{eyebrow && <span>{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div></div>{action && <div className="ui-card-action">{action}</div>}</header>;
}
export function CardContent({ className, children }) { return <div className={cn("ui-card-content", className)}>{children}</div>; }
export function CardFooter({ className, children }) { return <footer className={cn("ui-card-footer", className)}>{children}</footer>; }

export function Badge({ variant = "secondary", children, className }) {
  return <span className={cn("ui-badge", `ui-badge-${variant}`, className)}>{children}</span>;
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn("ui-input", className)} {...props} />;
});
export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn("ui-textarea", className)} {...props} />;
});
export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return <span className="ui-select-wrap"><select ref={ref} className={cn("ui-select", className)} {...props}>{children}</select><CaretDown aria-hidden="true" /></span>;
});

export function Field({ label, hint, error, required, className, children }) {
  return <label className={cn("ui-field", className)}><span>{label}{required && <b aria-hidden="true">*</b>}</span>{children}{error ? <small className="error">{error}</small> : hint ? <small>{hint}</small> : null}</label>;
}

export function Switch({ checked, onCheckedChange, label, description, disabled = false }) {
  return <label className={cn("ui-switch-row", disabled && "disabled")}><span><strong>{label}</strong>{description && <small>{description}</small>}</span><button type="button" role="switch" aria-checked={checked} className={cn("ui-switch", checked && "checked")} onClick={() => !disabled && onCheckedChange(!checked)} disabled={disabled}><i /></button></label>;
}

export function Tabs({ value, onValueChange, items }) {
  return <div className="ui-tabs" role="tablist" aria-label="Page sections">{items.map((item) => <button key={item.value} role="tab" aria-selected={value === item.value} className={value === item.value ? "active" : ""} onClick={() => onValueChange(item.value)}>{item.icon && <item.icon />}{item.label}{item.count != null && <Badge>{item.count}</Badge>}</button>)}</div>;
}

function useEscape(callback, active) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (event) => event.key === "Escape" && callback();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [callback, active]);
}

function Overlay({ open, title, description, onClose, children, type = "dialog", size = "md" }) {
  const panelRef = useRef(null);
  useEscape(onClose, open);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    document.body.classList.add("enterprise-lock");
    window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      document.body.classList.remove("enterprise-lock");
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(<div className={cn("ui-overlay", `ui-overlay-${type}`)}><button className="ui-overlay-backdrop" aria-label={`Close ${title}`} onClick={onClose} /><section ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="ui-overlay-title" aria-describedby={description ? "ui-overlay-description" : undefined} className={cn("ui-overlay-panel", `ui-overlay-${size}`)}><header><div><h2 id="ui-overlay-title">{title}</h2>{description && <p id="ui-overlay-description">{description}</p>}</div><IconButton label={`Close ${title}`} onClick={onClose}><X /></IconButton></header><div className="ui-overlay-body">{children}</div></section></div>, document.body);
}

export function Dialog(props) { return <Overlay type="dialog" {...props} />; }
export function Sheet(props) { return <Overlay type="sheet" {...props} />; }

export function SearchInput({ value, onChange, placeholder = "Search", className }) {
  return <label className={cn("ui-search", className)}><MagnifyingGlass aria-hidden="true" /><Input value={value} onChange={onChange} placeholder={placeholder} /></label>;
}

export function DataTable({ columns, rows, getRowKey = (row) => row.id, empty, onRowClick, loading = false }) {
  if (loading) return <div className="ui-table-skeleton">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} height={56} />)}</div>;
  if (!rows.length) return empty || <EmptyState title="No records" description="There is no data for the selected view." />;
  return <div className="ui-table-scroll"><table className="ui-table"><thead><tr>{columns.map((column) => <th key={column.key} style={column.width ? { width: column.width } : undefined}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={getRowKey(row)} className={onRowClick ? "clickable" : ""} onClick={() => onRowClick?.(row)}>{columns.map((column) => <td key={column.key} data-label={column.label}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}</tbody></table></div>;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return <div className="ui-empty">{Icon && <Icon weight="duotone" />}<h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function Skeleton({ height = 16, width = "100%", className }) {
  return <span className={cn("ui-skeleton", className)} style={{ height, width }} aria-hidden="true" />;
}

export function Metric({ label, value, detail, icon: Icon, tone = "default" }) {
  return <Card className={cn("ui-metric", `tone-${tone}`)}>{Icon && <span><Icon weight="duotone" /></span>}<div><small>{label}</small><strong>{value}</strong>{detail && <p>{detail}</p>}</div></Card>;
}

export function PageHeader({ eyebrow, title, description, actions, children }) {
  return <div className="ui-page-header"><div>{eyebrow && <span>{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}{children}</div>{actions && <div className="ui-page-actions">{actions}</div>}</div>;
}

const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const toast = useCallback((message, variant = "success") => {
    const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    setItems((current) => [...current, { id, message, variant }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 5000);
  }, []);
  const dismiss = useCallback((id) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const value = useMemo(() => ({ toast }), [toast]);
  return <ToastContext.Provider value={value}>{children}<div className="ui-toasts" aria-live="polite">{items.map((item) => <div key={item.id} className={cn("ui-toast", item.variant)}>{item.variant === "error" ? <Warning weight="fill" /> : <CheckCircle weight="fill" />}<span>{item.message}</span><IconButton label="Dismiss notification" onClick={() => dismiss(item.id)}><X /></IconButton></div>)}</div></ToastContext.Provider>;
}
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context.toast;
}

export function LoadingScreen({ label = "Loading administrator workspace" }) {
  return <main className="ui-loading-screen" role="status"><SpinnerGap className="ui-spin" /><strong>{label}</strong></main>;
}

export function PermissionGate({ permissions, permission, children, fallback = null }) {
  return permissions?.includes("*") || permissions?.includes(permission) ? children : fallback;
}
