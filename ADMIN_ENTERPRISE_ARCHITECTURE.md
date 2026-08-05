# BJ Electronics Enterprise Administrator Architecture

## Scope

The production administrator application is a responsive operations control center served from `/admin/`. It replaces the legacy production entry while preserving the existing catalog-import and Cloudinary media workflows.

## UI system

The administrator interface uses source-owned, shadcn-compatible React primitives rather than a packaged component library. This keeps the component source inside the repository, follows the compositional shadcn model, and avoids introducing a runtime dependency or a lockfile migration during the platform upgrade.

Primitive coverage:

- Button and icon button variants
- Card, header, content and footer
- Badge and status presentation
- Input, textarea, select and field composition
- Switch and tabs
- Dialog and sheet overlays with focus restoration and Escape handling
- Responsive data tables
- Skeleton, empty state and metrics
- Toast notifications and live regions
- Permission gates

The design system is tokenized in `src/admin-enterprise/admin-enterprise.css` with light/dark surfaces, semantic status colors, density-ready layout, responsive navigation, mobile table presentation, focus-visible indicators and reduced-motion support.

## Administrator surfaces

- Executive dashboard
- Orders and fulfillment
- Products CRUD
- Inventory management
- Atomic JSON/CSV catalog operations
- Customers
- Promotions and coupons
- Cloudinary media library
- Storefront customization
- Integration Hub
- Administrators and role-based access control
- Audit history
- System and environment status
- Global command search

## Authentication

Email/password administration remains available through the dedicated HTTP-only administrator session.

Google and GitHub OAuth are supported when a client ID and client secret are configured. OAuth authentication:

1. signs and validates a short-lived state token;
2. requires a verified provider email;
3. finds an existing BJ Electronics user with `role = admin` and the same email;
4. never auto-creates or promotes an administrator;
5. links the provider identity for auditability;
6. issues the same two-hour administrator session used by email login.

OAuth credentials can be supplied through Hostinger environment variables or, after an administrator signs in by email, through the encrypted Integration Hub.

## RBAC

Permissions are enforced on the server and used by the client to hide unavailable navigation. Default system roles are:

- Super administrator
- Store manager
- Catalog manager
- Fulfillment manager
- Marketing manager
- Analyst

Custom roles can be created by administrators with `users.manage`. Role assignments are committed in a database transaction and take effect on subsequent authorized requests.

## Integration Hub

Runtime credentials are encrypted with AES-256-GCM using `ADMIN_VAULT_KEY`. Secret values are never returned to the browser.

Runtime activation is implemented for:

- Upstash Redis REST cache
- Cloudinary signed media
- Google administrator OAuth
- GitHub administrator OAuth
- GitHub repository API metadata

Credential storage and connection validation surfaces are included for:

- SMTP
- SSLCOMMERZ
- Pathao Courier
- Steadfast Courier
- RedX

Those providers require their transaction-specific workflow modules before orders, messages or payments are sent automatically. The interface identifies them as `Workflow required` rather than presenting stored credentials as a live transaction integration.

## Environment-variable boundary

A running application cannot safely mutate the environment of its Hostinger process. The System page therefore displays only redacted configured/unconfigured status for boot-critical values such as database credentials, JWT secrets and canonical URLs.

The encrypted Integration Hub is used for supported runtime credentials. Redis and Cloudinary refresh in the running process after a saved configuration or connection test; no source-code rebuild is required.

## Storefront customization

Store identity, appearance tokens, commerce settings, checkout controls, SEO defaults and notification preferences are stored in MySQL. The public endpoint `/api/storefront/config` returns the approved non-secret configuration.

The storefront loads that endpoint before React renders and applies brand color, radius and SEO settings. Administrator and secret settings are never included.

## Security controls

- Dedicated HTTP-only administrator cookie
- Strict administrator session cookie policy
- CSRF validation for writes
- Role and permission checks on administrator APIs
- AES-256-GCM integration secret encryption
- OAuth state validation
- Verified-email administrator matching
- Private no-store administrator responses
- Audit logs for privileged changes and authentication
- Frontend secret-boundary checks
- Bounded request size for catalog import

## Deployment

Production remains a single Hostinger Node.js application:

- build: `npm run hostinger:build`
- output: `dist`
- entry: `index.js`
- storefront: `/`
- administrator: `/admin/`
- API: `/api/`

Merges to the connected `main` branch trigger the existing deployment workflow. Hostinger environment changes still require a Hostinger redeploy; runtime Integration Hub changes do not.
