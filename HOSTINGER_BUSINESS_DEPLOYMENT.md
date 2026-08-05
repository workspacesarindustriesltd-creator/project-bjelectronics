# BJ Electronics — Hostinger GitHub deployment

This repository is prepared for Hostinger's managed Node.js Web App deployment from GitHub. One Express process serves the storefront, administrator portal, and API from a single canonical HTTPS origin.

## Production routes

| Surface | Production URL | Access policy |
|---|---|---|
| Storefront | `https://bjelectronics.shop/` | Public |
| Customer sign in and registration | `https://bjelectronics.shop/` | Public storefront account flow |
| Administrator login | `https://bjelectronics.shop/admin/` | Public login shell; no administrator credentials are bundled |
| Administrator workspace | `https://bjelectronics.shop/admin/dashboard` | Valid administrator session required by Express |
| API | `https://bjelectronics.shop/api/` | Public or authenticated per endpoint |
| Health check | `https://bjelectronics.shop/api/health` | Public, non-cacheable JSON |

`/admin` and `/api` are application paths. Do not create separate `admin` or `api` DNS records.

If `www.bjelectronics.shop` is enabled, permanently redirect it to `https://bjelectronics.shop` so cookies, CORS, canonical URLs, and CDN behavior remain consistent.

## Security boundaries included in the build

The production build now verifies these boundaries:

- The storefront JavaScript bundle excludes administrator links, routes, API calls, dashboard components, and administrator demo data.
- The administrator bundle excludes hard-coded administrator email addresses, passwords, and local session bypasses.
- Unauthenticated HTML navigation under protected `/admin/*` routes is redirected server-side to `/admin/login`.
- Administrator API routes require a dedicated administrator JWT cookie and the `admin` role.
- Customer and administrator cookies are isolated; signing into one surface clears the other session.
- Administrator sessions expire after two hours.
- `/admin/*` and `/api/*` responses are marked private, non-cacheable, and non-indexable.
- Hashed static assets use long immutable caching; unhashed public assets use short CDN-safe caching.

Production credentials must exist only in Hostinger environment variables and the database. Never commit `.env` files or passwords.

## 1. Protect current production data

Before replacing an existing website or changing its database:

1. Download a complete website backup from hPanel.
2. Export the production database through phpMyAdmin.
3. Confirm the SQL export is non-empty.
4. Store another copy outside Hostinger.

Migration `004_remove_online_payment_gateway.sql` permanently removes the obsolete payment table.

## 2. Create or select the Hostinger database

In hPanel, open **Databases → MySQL Databases** and record the complete Hostinger-generated values:

- Database name
- Database user
- Database password
- Host: `localhost`
- Port: `3306`

Hostinger normally prefixes database names and users. Use the complete displayed values.

For a fresh database, import `database/schema.sql` through phpMyAdmin. For an existing database, back it up and run the required migrations once. Where command execution is available, the packaged application supports:

```bash
npm run db:migrate
```

## 3. Connect GitHub and enable automatic deployment

In hPanel:

1. Open **Websites → Add Website**.
2. Choose **Deploy Web App**.
3. Choose **Import Git Repository**.
4. Select `workspacesarindustriesltd-creator/project-bjelectronics`.
5. Select branch `main`.
6. Keep automatic redeployment enabled for pushes to `main`.
7. Connect the production domain `bjelectronics.shop` to this Web App.
8. Follow the DNS instructions displayed by Hostinger and allow SSL provisioning to finish.

Use pull requests for production changes. GitHub Actions validates builds, tests, dependency security, Hostinger output, and frontend security boundaries before merge. After a successful merge to `main`, the connected Hostinger Web App can redeploy the commit automatically.

## 4. Deployment settings

Confirm these settings in the Hostinger Web App dashboard:

| Setting | Value |
|---|---|
| Framework | `Express.js` |
| Node.js version | `20.x` |
| Root directory | repository root, blank or `.` |
| Install command | `npm ci` |
| Build command | `npm run hostinger:build` |
| Output directory | `dist` |
| Entry file | `index.js` |
| Start command | `npm start` |

Do not set a fixed `PORT`; Hostinger supplies it. When `dist` is selected as the output directory, the correct entry is `dist/index.js`, represented as `index.js` inside that output directory.

## 5. Environment variables

Add the following values in hPanel and replace every placeholder:

```env
NODE_ENV=production
STORE_URL=https://bjelectronics.shop
ADMIN_URL=https://bjelectronics.shop
PUBLIC_API_URL=https://bjelectronics.shop
VITE_STORE_URL=https://bjelectronics.shop
VITE_ADMIN_URL=https://bjelectronics.shop
JWT_SECRET=<random secret containing at least 32 characters>
DB_HOST=localhost
DB_PORT=3306
DB_NAME=<complete Hostinger database name>
DB_USER=<complete Hostinger database user>
DB_PASSWORD=<strong database password>
DB_CONNECTION_LIMIT=10
ADMIN_NAME=<administrator display name>
ADMIN_EMAIL=<private administrator email used as the login identifier>
ADMIN_PHONE=
ADMIN_PASSWORD=<unique password containing at least 12 characters>
```

Keep the URL variables origin-only. Do not append `/admin` or `/api`; Express owns those paths. Do not define `COOKIE_DOMAIN` for this single-apex deployment unless a future subdomain architecture specifically requires it.

Generate `JWT_SECRET` with a cryptographically secure password generator. Do not reuse the database password or administrator password.

## 6. Seed the administrator account

After the database and environment variables are configured, run once:

```bash
npm run db:seed-users
```

The seed command rejects missing values, short passwords, and known placeholder passwords. It creates or updates only the configured administrator unless `SEED_DEMO_USER=true` is deliberately set outside production. Never enable that flag in production.

## 7. Enable and configure Hostinger CDN

In hPanel:

1. Open **Websites → Dashboard → Performance → CDN**.
2. Enable CDN for `bjelectronics.shop`.
3. Keep the normal security level for routine traffic; reserve aggressive attack protection for an active incident.
4. Enable image optimization only after checking product-image quality and layout.
5. Do not create cache rules that override the application's `private, no-store` headers for `/admin/*` or `/api/*`.
6. After the first deployment or a routing change, use **Flush cache** once, then verify all production routes again.

Expected application cache behavior:

- `/admin/*`: private, no-store
- `/api/*`: private, no-store
- Storefront HTML: revalidated on each navigation
- Hashed JavaScript, CSS, fonts, and images: one year, immutable
- Unhashed public assets: one day with stale-while-revalidate

## 8. Production verification

Verify in this order:

1. `https://bjelectronics.shop/api/health` returns JSON containing `status: ok`.
2. `https://bjelectronics.shop/` loads the storefront.
3. The customer sign-in and registration page contains no administrator link or administrator details.
4. `https://bjelectronics.shop/admin/` loads the secure administrator login with blank credential fields.
5. An unauthenticated request to `/admin/dashboard` redirects to `/admin/login`.
6. Valid administrator credentials open `/admin/dashboard`.
7. A customer session cannot access `/api/admin/*`.
8. Administrator logout invalidates the administrator session.
9. Product loading, cash-on-delivery ordering, bank-transfer ordering, stock deduction, cancellation, and inventory restoration work correctly.
10. Response headers show `no-store` for `/admin/*` and `/api/*` after CDN is enabled.

## 9. Operational deployment flow

1. Create a feature branch.
2. Open a pull request into `main`.
3. Wait for the GitHub Actions `CI` workflow to pass.
4. Merge the pull request.
5. Hostinger automatically redeploys the new `main` commit when its GitHub integration is connected and automatic deployment is enabled.
6. Check `/api/health`, storefront, administrator login, and one protected administrator route.
7. Flush CDN only when stale routing or assets are observed after a deployment.
