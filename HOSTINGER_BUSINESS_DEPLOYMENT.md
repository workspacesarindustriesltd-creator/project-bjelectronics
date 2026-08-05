# Hostinger Business Web Hosting deployment

This repository is structured for Hostinger's managed Node.js GitHub deployment with automatic framework and runtime detection.

## Production domain and routes

Use one canonical Hostinger-managed HTTPS origin:

- Storefront: `https://bjelectronics.shop/`
- Administrator portal: `https://bjelectronics.shop/admin/`
- API: `https://bjelectronics.shop/api/`
- API health check: `https://bjelectronics.shop/api/health`
- Database: Hostinger MySQL/MariaDB on `localhost:3306`

The administrator portal and API are application paths. Do not create separate `admin` or `api` DNS records for this Business Web Hosting deployment.

If `www.bjelectronics.shop` is enabled, redirect it permanently to `https://bjelectronics.shop` so the application has one canonical origin.

## Automatic repository detection

Hostinger can detect the application from the repository root because it contains:

- `package.json` with Express, `main: index.js`, standard `build` and `start` scripts
- root `index.js` application entrypoint
- `.nvmrc` and `engines.node` pinned to Node.js 20
- `package-lock.json` for deterministic npm installation

The production build also creates a self-contained `dist` runtime containing:

- `dist/package.json`
- `dist/package-lock.json`
- `dist/index.js`
- `dist/runtime/server`
- `dist/runtime/database`
- `dist/client`

This supports Hostinger deployments that start from either the repository root or the selected `dist` output directory.

## 1. Protect existing production data

Before replacing an existing website or changing the database schema:

1. Download a complete website backup from hPanel.
2. Export the production database through phpMyAdmin.
3. Verify the SQL backup is not empty.
4. Retain an additional copy outside Hostinger.

Migration `004_remove_online_payment_gateway.sql` permanently drops the obsolete payment table.

## 2. Create or select the Hostinger database

In hPanel, open **Databases → MySQL Databases** and record the complete Hostinger-generated values:

- Database name
- Database user
- Database password
- Host: `localhost`
- Port: `3306`

Hostinger normally prefixes database names and users. Use the complete displayed values.

## 3. Prepare the database

### Fresh database

Import `database/schema.sql` through phpMyAdmin.

### Existing database

1. Confirm the backup is available.
2. Select the correct production database in phpMyAdmin.
3. Run `database/migrations/004_remove_online_payment_gateway.sql` once.
4. Confirm the `orders.payment_method` column exists.
5. Confirm the obsolete `payments` table is removed.

Where command execution is available, the packaged runtime also supports:

```bash
npm run db:migrate
```

## 4. Connect the GitHub repository and domain

In hPanel:

1. Open **Websites → Add Website**.
2. Select **Deploy Web App**.
3. Select **Import Git Repository**.
4. Choose `workspacesarindustriesltd-creator/project-bjelectronics`.
5. Select branch `main`.
6. After deployment, open the Node.js website dashboard and select **Connect domain**.
7. Enter `bjelectronics.shop` and follow Hostinger's DNS instructions.
8. Wait for DNS propagation and automatic SSL installation.

## 5. Deployment settings

Hostinger should detect most values automatically. Confirm these values before deployment:

| Setting | Value |
|---|---|
| Framework | `Express.js` |
| Node.js version | `20.x` |
| Root directory | repository root, blank or `.` |
| Install command | automatic `npm ci` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Entry file | `index.js` |
| Start command | `npm start` |

For full tests and the production dependency audit during the Hostinger build, use:

```text
npm run hostinger:build
```

Do not configure `server/index.js` as the entry file when the selected output directory is `dist`. The correct output entry is `index.js`.

Do not set a fixed `PORT`; Hostinger supplies the runtime port.

## 6. Environment variables

Add these values through hPanel and replace every placeholder:

```env
NODE_ENV=production
STORE_URL=https://bjelectronics.shop
ADMIN_URL=https://bjelectronics.shop
PUBLIC_API_URL=https://bjelectronics.shop
VITE_STORE_URL=https://bjelectronics.shop
VITE_ADMIN_URL=https://bjelectronics.shop
JWT_SECRET=<random secret with at least 32 characters>
DB_HOST=localhost
DB_PORT=3306
DB_NAME=<complete Hostinger database name>
DB_USER=<complete Hostinger database user>
DB_PASSWORD=<database password>
DB_CONNECTION_LIMIT=10
ADMIN_NAME=Store Administrator
ADMIN_EMAIL=<administrator email>
ADMIN_PASSWORD=<unique password with at least 12 characters>
```

Keep the URL variables origin-only. Do not append `/admin` or `/api`; Express owns those paths.

Do not commit production credentials to GitHub.

## 7. Deploy and verify

After deployment, verify:

- `https://bjelectronics.shop/api/health`
- `https://bjelectronics.shop/`
- `https://bjelectronics.shop/admin/`

Then test customer authentication, administrator authentication, product loading, cash-on-delivery ordering, bank-transfer ordering, stock deduction, cancellation, and inventory restoration.

## 8. Continuous deployment

When the GitHub repository is connected, pushes to the selected branch can trigger automatic redeployment. Keep production changes behind pull requests and require successful GitHub Actions checks before merging.
