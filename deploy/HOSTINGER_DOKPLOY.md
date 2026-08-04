# Hostinger VPS + Dokploy deployment

This deployment runs four isolated services from one GitHub repository:

- `store` — customer storefront, internal port `80`
- `admin` — administrator portal, internal port `80`
- `api` — Express API, internal port `4000`
- `mysql` — private MySQL 8.4 database with a named persistent volume

## 1. Prepare Hostinger

1. Create or open a Hostinger VPS using the **Ubuntu 24.04 with Dokploy** template.
2. Open Dokploy at `http://YOUR_VPS_IP:3000` and create the administrator account.
3. Secure Dokploy with HTTPS before entering production secrets.
4. In Hostinger DNS, point these records to the VPS IP:
   - `www.bjelectronics.shop`
   - `admin.bjelectronics.shop`
   - `api.bjelectronics.shop`
5. Redirect the apex domain `bjelectronics.shop` to `https://www.bjelectronics.shop` so the storefront has one canonical browser origin.

## 2. Back up the current database

Before importing or migrating production data, download and verify a complete SQL backup from the current MySQL host. Do not run migration `004_remove_online_payment_gateway.sql` without this backup; it permanently removes the obsolete payment table and provider column.

## 3. Connect GitHub

1. In Dokploy, open **Git Providers → GitHub**.
2. Select **Install & Authorize** and grant access only to:
   `workspacesarindustriesltd-creator/project-bjelectronics`.
3. Create a project named `BJ Electronics Production`.
4. Add a **Docker Compose** service.
5. Select the repository and the `main` branch.
6. Set the Compose file path to:
   `deploy/compose.production.yml`

Dokploy will automatically redeploy the selected branch after future pushes unless automatic deployment is disabled.

## 4. Configure environment variables

Copy the variable names from `deploy/.env.production.example` into Dokploy's **Environment** tab and replace every placeholder with a real production value.

Required secrets:

- `JWT_SECRET` — random, at least 32 characters
- `DB_PASSWORD` — application database password
- `MYSQL_ROOT_PASSWORD` — different root password
- `ADMIN_EMAIL` — production administrator email
- `ADMIN_PASSWORD` — unique, at least 12 characters

Do not commit real values to GitHub.

## 5. Deploy the stack

Click **Deploy** and monitor the deployment logs. Dokploy builds each Dockerfile independently and starts the services on a private Compose network.

Create these domain routes in the Compose service:

| Domain | Service | Container port |
|---|---|---:|
| `www.bjelectronics.shop` | `store` | `80` |
| `admin.bjelectronics.shop` | `admin` | `80` |
| `api.bjelectronics.shop` | `api` | `4000` |

Enable Let's Encrypt TLS for all three domains. Do not expose the `mysql` service publicly.

## 6. Restore data and run the migration

For an existing production database:

1. Import the verified SQL backup into the `mysql` service.
2. Open the Dokploy terminal for the `api` service.
3. Run:

```bash
npm run db:migrate
```

For a completely new database, run the same migration command after MySQL becomes healthy.

To create the configured administrator account after migration, run once:

```bash
npm run db:seed-users
```

Do not run seed commands repeatedly unless their behavior has been reviewed.

## 7. Verify production

Check these endpoints in order:

1. `https://api.bjelectronics.shop/api/health`
2. `https://www.bjelectronics.shop`
3. `https://admin.bjelectronics.shop/admin/`

Then test:

- customer registration and sign-in
- administrator sign-in
- product and inventory loading
- cash-on-delivery order creation
- bank-transfer order creation
- order cancellation and stock restoration

## 8. Configure recurring backups

In Dokploy, configure MySQL backups to an S3-compatible destination, run a manual test backup, and confirm that the backup object exists before enabling the schedule.
