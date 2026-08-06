# Administrator Operations Hub — Phase 2

## Scope

Phase 2 moves high-frequency store operations out of the legacy `AdminPortal.jsx` implementation and into modular, route-aware pages.

Managed routes:

- `/admin/orders`
- `/admin/products`
- `/admin/inventory`
- `/admin/customers`

The overview, promotions, media, settings and catalog-control routes remain available while the migration continues.

## Architecture

```text
src/admin/operations/
├── OperationsConsole.jsx
├── OrdersPage.jsx
├── ProductsPage.jsx
├── CustomersPage.jsx
├── components.jsx
└── operations.css
```

`AdminPlatform.jsx` is the route boundary. It listens for browser navigation and the internal `admin:navigation` event so legacy navigation and the modular console can coexist without a new routing dependency.

## Orders

- operational KPI cards
- all/open/delivered/cancelled tabs
- full-text search
- exact status filter
- date, customer and value sorting
- pagination
- row selection
- bulk fulfillment-status updates
- keyboard-accessible detail drawer
- print-friendly order view

## Products and inventory

- catalog and inventory KPI cards
- active, low-stock, out-of-stock and hidden views
- category filtering
- price, name and stock sorting
- pagination
- inline stock controls
- product detail drawer
- product create/edit form
- local-device image selection
- signed Cloudinary browser upload
- image URL fallback
- publishing and featured controls

## Customers

- customer, order and lifetime-value metrics
- new, repeat and high-value segmentation
- name, contact and account search
- value, order count and account-age sorting
- avatar fallbacks
- customer detail drawer
- email and phone actions

## Accessibility

- semantic headings and navigation landmarks
- visible focus states inherited from the administrator design system
- keyboard-operable table rows
- focus-contained drawers with Escape handling
- accessible labels for filters and icon actions
- reduced-motion support
- responsive mobile navigation and data-table layouts

## Production behavior

All data comes from protected administrator APIs. Product and order mutations continue to use the shared CSRF-aware `apiRequest` client. Product images are uploaded directly to Cloudinary only after obtaining a signed upload configuration from the protected administrator media endpoint.

No production credential is added to the browser bundle or repository.

## Production validation gate

The merged Phase 2 source is validated from `main` using the repository CI workflow. The gate runs source-quality checks, storefront and administrator builds, automated API and UI-source tests, frontend credential-boundary checks, Hostinger runtime validation and the production dependency audit.

## Next migration phase

The remaining legacy surfaces can be moved into modular pages in this order:

1. Overview analytics and customizable widgets
2. Promotions and campaign management
3. Media asset library with folders and reusable attachments
4. Settings, integrations and role management
5. Removal of unused page implementations from `AdminPortal.jsx`
