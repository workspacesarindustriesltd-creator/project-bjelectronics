# BJ Electronics production domain configuration

## Canonical application origin

Use one Hostinger-managed Node.js website and one canonical HTTPS origin:

- Storefront: `https://bjelectronics.shop/`
- Administrator portal: `https://bjelectronics.shop/admin/`
- API base: `https://bjelectronics.shop/api/`
- API health check: `https://bjelectronics.shop/api/health`

The administrator portal and API are application paths, not separate domains or subdomains. Do not create `admin` or `api` DNS records for this deployment.

## Hostinger domain connection

1. Open the deployed Node.js application in hPanel.
2. Select **Connect domain**.
3. Enter `bjelectronics.shop`.
4. Complete any DNS instructions shown by Hostinger.
5. Wait for DNS propagation and automatic SSL installation.
6. Keep `bjelectronics.shop` as the primary domain.

If `www.bjelectronics.shop` is enabled, redirect it permanently to `https://bjelectronics.shop` so there is one canonical origin.

## Production environment variables

Use the origin only. Do not append `/admin` or `/api` to these variables:

```env
NODE_ENV=production
STORE_URL=https://bjelectronics.shop
ADMIN_URL=https://bjelectronics.shop
PUBLIC_API_URL=https://bjelectronics.shop
VITE_STORE_URL=https://bjelectronics.shop
VITE_ADMIN_URL=https://bjelectronics.shop
```

The application adds `/admin/` and `/api/` through Express routing. Keeping the variables origin-only also preserves correct CORS and cookie behavior.

## Deployment settings

```text
Framework: Express.js
Node.js version: 20.x
Root directory: .
Build command: npm run hostinger:build
Output directory: dist
Entry file: index.js
Start command: npm start
```

Do not set `PORT`; Hostinger provides it automatically.

## Verification

After domain connection and deployment, verify:

1. `https://bjelectronics.shop/api/health` returns JSON with `status: ok`.
2. `https://bjelectronics.shop/` loads the storefront.
3. `https://bjelectronics.shop/admin/` loads the administrator portal.
4. Unknown `/api/*` routes return JSON 404 responses rather than a frontend page.
5. Customer and administrator authentication cookies remain isolated.
