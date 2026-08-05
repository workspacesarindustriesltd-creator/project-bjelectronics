# BJ Electronics production domain configuration

## Canonical origin

Use one Hostinger-managed Node.js Web App and one canonical HTTPS origin:

- Storefront: `https://bjelectronics.shop/`
- Administrator login: `https://bjelectronics.shop/admin/`
- Protected administrator workspace: `https://bjelectronics.shop/admin/dashboard`
- API base: `https://bjelectronics.shop/api/`
- API health check: `https://bjelectronics.shop/api/health`

`/admin` and `/api` are Express application paths, not subdomains. Do not create `admin` or `api` DNS records.

Keep `bjelectronics.shop` as the primary domain. Permanently redirect `www.bjelectronics.shop` to the apex domain when `www` is enabled.

## Runtime URL variables

Use origin-only values:

```env
NODE_ENV=production
STORE_URL=https://bjelectronics.shop
ADMIN_URL=https://bjelectronics.shop
PUBLIC_API_URL=https://bjelectronics.shop
VITE_STORE_URL=https://bjelectronics.shop
VITE_ADMIN_URL=https://bjelectronics.shop
```

Do not append `/admin` or `/api`. The application adds those paths and uses the origin values for CORS validation.

## Hostinger deployment values

```text
Framework: Express.js
Node.js version: 20.x
Root directory: .
Install command: npm ci
Build command: npm run hostinger:build
Output directory: dist
Entry file: index.js
Start command: npm start
```

Do not set `PORT`; Hostinger supplies it.

## Route behavior

- `/admin` permanently redirects to `/admin/`.
- `/admin/` and `/admin/login` serve the login shell without prefilled credentials.
- Protected `/admin/*` page navigation requires a valid administrator session and otherwise redirects to `/admin/login`.
- `/api/admin/*` requires a valid administrator session and role.
- `/admin/*` and `/api/*` return private, non-cacheable, non-indexable headers.
- Unknown `/api/*` routes return JSON 404 responses and never fall back to a frontend page.

## CDN behavior

Enable Hostinger CDN from **Websites → Dashboard → Performance → CDN** after the domain points to Hostinger. Do not override `private, no-store` responses for `/admin/*` or `/api/*`. Flush CDN once after the first secured deployment or whenever a stale route remains visible.

## Verification

1. `/api/health` returns `status: ok`.
2. `/` loads the public storefront.
3. The storefront customer account screen contains no administrator links or data.
4. `/admin/` shows blank administrator credential fields.
5. `/admin/dashboard` redirects to login without an administrator session.
6. `/admin/dashboard` loads after valid administrator authentication.
7. A customer cookie receives `401` from `/api/admin/*`.
8. `/admin/*` and `/api/*` include `Cache-Control: private, no-store`.
