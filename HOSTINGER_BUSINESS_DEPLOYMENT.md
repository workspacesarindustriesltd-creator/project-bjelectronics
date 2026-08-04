# Hostinger Business Web Hosting deployment

This deployment target uses one managed Node.js website:

- Storefront: `/`
- Administrator portal: `/admin/`
- API: `/api/`
- Database: Hostinger MySQL/MariaDB on `localhost:3306`

The Express process serves both Vite builds and the API. No VPS, Docker, Nginx, or process manager is required.

## 1. Protect the existing website and database

Before replacing an existing website:

1. Download a full website backup from hPanel.
2. Export the production database with phpMyAdmin.
3. Verify the SQL backup is not empty and keep an off-host copy.
4. Do not remove an existing website until both backups are verified.

The payment-removal migration permanently drops the obsolete `payments` table.

## 2. Create the Hostinger database

In hPanel, open **Databases → MySQL Databases** and create or select the production database.

Record the complete Hostinger-generated values:

- Database name
- Database user
- Database password
- Host: `localhost`
- Port: `3306`

Hostinger normally prefixes database names and users with the account identifier. Use the complete displayed values.

## 3. Prepare the database

### Fresh database

Import `database/schema.sql` through phpMyAdmin.

### Existing production database

1. Import the verified backup into the selected database if required.
2. Review `database/migrations/004_remove_online_payment_gateway.sql`.
3. Run it once through phpMyAdmin after confirming the backup.
4. Do not rerun the payment-status normalization manually after production orders have been created under the new model.

The application migration runner remains available for controlled environments with command access:

```bash
npm run db:migrate
```

## 4. Create the Node.js website

In hPanel:

1. Open **Websites → Add Website**.
2. Choose **Deploy Web App** or **Node.js Web App**.
3. Select **Import Git Repository**.
4. Connect GitHub or paste the public repository URL.
5. Select repository `workspacesarindustriesltd-creator/project-bjelectronics`.
6. Select branch `main`.
7. Select framework **Express.js** or **Other** if automatic detection does not select Express.

If `bjelectronics.shop` is already attached to another website, download backups first, remove that website only when safe, and then add the domain as the new Node.js website.

## 5. Build settings

Use these values:

| Setting | Value |
|---|---|
| Node.js version | `20.x` |
| Root directory | repository root |
| Install command | automatic `npm ci` |
| Build command | `npm run hostinger:build` |
| Start command | `npm start` |
| Output directory | `dist` |
| Entry file | `server/index.js` |

Do not set a fixed `PORT`. Hostinger injects the application port at runtime.

## 6. Environment variables

Copy the keys from `deploy/hostinger-business.env.example` into the hPanel environment-variable editor and replace every placeholder.

For the single-domain Business deployment, use the same HTTPS origin for:

```env
STORE_URL=https://www.bjelectronics.shop
ADMIN_URL=https://www.bjelectronics.shop
PUBLIC_API_URL=https://www.bjelectronics.shop
VITE_STORE_URL=https://www.bjelectronics.shop
VITE_ADMIN_URL=https://www.bjelectronics.shop
```

Required security and database values:

```env
NODE_ENV=production
JWT_SECRET=<random secret, at least 32 characters>
DB_HOST=localhost
DB_PORT=3306
DB_NAME=<full Hostinger database name>
DB_USER=<full Hostinger database user>
DB_PASSWORD=<database password>
ADMIN_EMAIL=<administrator email>
ADMIN_PASSWORD=<unique password, at least 12 characters>
```

Do not commit real credentials to GitHub.

## 7. Deploy

Start the deployment from hPanel. Hostinger will install dependencies, run the build command, and start the Express process.

The build must complete all of these stages:

- Storefront production build
- Administrator production build
- Packaging
- Automated tests
- Production dependency audit

## 8. Initial administrator and catalog

The repository contains controlled seed commands:

```bash
npm run db:seed-users
npm run db:seed-catalog
```

If hPanel does not expose a command runner, create the administrator before launch through a controlled local connection or request Hostinger support to execute the one-time commands. Do not place a password hash or plaintext production password in SQL committed to the repository.

## 9. Verify production

Check:

- `https://www.bjelectronics.shop/api/health`
- `https://www.bjelectronics.shop/`
- `https://www.bjelectronics.shop/admin/`

Then verify customer login, administrator login, catalog loading, cash-on-delivery orders, bank-transfer orders, stock deduction, order cancellation, and inventory restoration.

## 10. Continuous deployment

When GitHub integration is enabled, Hostinger can redeploy the selected branch after pushes. Keep production changes behind pull requests and require the GitHub Actions checks before merging.
