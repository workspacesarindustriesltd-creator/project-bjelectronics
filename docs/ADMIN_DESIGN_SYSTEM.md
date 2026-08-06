# BJ Electronics administrator design system

## Architecture

- `src/admin/ui/index.jsx` contains reusable, accessible React primitives.
- `src/admin/ui/design-system.css` contains semantic design tokens, responsive behavior and compatibility styling for existing administrator pages.
- Feature pages should compose primitives rather than add new one-off buttons, fields, cards, tables or upload controls.
- API traffic policies are centralized in `server/http/rate-limiters.js`.

## Component inventory

- `Button`, `IconButton`
- `Card`, `PageHeader`
- `Field`, `SearchField`, `Select`
- `Badge`, `Avatar`
- `Tabs`, `Menu`
- `DataTable`, `Pagination`
- `FileDropzone`
- `EmptyState`, `Skeleton`, `ToastRegion`

## Layout rules

1. Use the shared page header for every route.
2. Keep primary actions in the page-header action area.
3. Use cards only to group related information, not every text block.
4. Use a maximum content width while allowing tables to scroll horizontally.
5. Use drawers for contextual inspection and focused edits; use full pages for complex multi-step workflows.
6. Keep filters and sorting controls directly above their table or collection.
7. Use semantic status badges and never communicate state through color alone.

## Accessibility

- Every icon-only action requires a visible tooltip or `aria-label`.
- All fields require labels; placeholder text is supplementary.
- Dialogs must restore focus when closed and support Escape.
- Interactive rows must support Enter and Space.
- Loading, error and success feedback must use suitable live regions.
- Motion respects `prefers-reduced-motion`.
- Text and control colors must use design tokens with sufficient contrast.

## Uploads and attachments

`FileDropzone` supports keyboard activation, drag and drop, local device selection, file-size validation, attachment lists and removal. Feature modules remain responsible for MIME rules, upload signatures and remote persistence.

## API rate limits

- Global traffic protects the entire service.
- Authentication uses a strict limit and does not count successful requests.
- Administrator reads and writes have independent budgets.
- Upload signature and media endpoints have a separate upload budget.
- Health checks bypass the general limiter so infrastructure probes remain reliable.

## Migration guidance

Existing `.adm-*` and `.ops-*` pages receive normalized tokens and layout styling immediately. Refactor feature modules incrementally to import primitives from `src/admin/ui/index.jsx`, beginning with media, products, orders and customer details.
