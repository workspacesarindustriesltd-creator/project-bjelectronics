# Hostinger automatic deployment

BJ Electronics is packaged as a managed Node.js application for Hostinger Business or Cloud hosting.

## GitHub repository source

- Repository: `workspacesarindustriesltd-creator/project-bjelectronics`
- Production branch: `main`
- Runtime: Node.js `22.x`
- Install command: `npm ci`
- Build command: `npm run hostinger:build`
- Output directory: `dist`
- Entry file: `index.js`
- Start command: `npm start`

Hostinger's GitHub integration should be connected to this repository and the `main` branch. Automatic deployment must be enabled so every successful merge to `main` starts a new Hostinger build.

## Environment variables

Copy the variable names from `deploy/hostinger-business.env.example` into the Hostinger Node.js application environment. Never commit production values to GitHub.

Required production groups:

- public application URLs
- MySQL connection
- JWT and administrator vault secrets
- initial administrator credentials

Optional live integrations:

- Upstash Redis
- Cloudinary
- Google OAuth
- GitHub OAuth

Redis and Cloudinary may also be configured through the encrypted administrator Integration Hub after the application is running.

## GitHub deployment workflow

`.github/workflows/hostinger-deployment.yml` runs only after the normal `CI` workflow succeeds on `main`.

It performs the following operations:

1. Checks out the exact verified commit.
2. Installs the locked dependency graph with Node.js 22.
3. Runs the complete Hostinger production build, tests and dependency audit.
4. Validates the generated Node.js entry files and runtime engine.
5. Creates a checksum-protected deployment archive.
6. Uploads the archive as a GitHub Actions artifact for 14 days.
7. Optionally triggers a Hostinger auto-deployment webhook.
8. Optionally verifies the public storefront, administrator shell and API health endpoint.

## Optional GitHub configuration

In GitHub repository settings, open **Settings → Secrets and variables → Actions**.

### Secret

`HOSTINGER_DEPLOY_WEBHOOK_URL`

Add this only when the Hostinger application supplies an auto-deployment webhook. Keep it blank when the Node.js application is connected through Hostinger's native GitHub integration; Hostinger will already receive `main` pushes automatically.

### Variables

`HOSTINGER_HEALTHCHECK_ENABLED=true`

`PRODUCTION_BASE_URL=https://bjelectronics.shop`

Enable the health check only after DNS and the Hostinger application route are active. When enabled, the workflow requires:

- `/api/health` to return JSON with `status: "ok"`
- the database dependency to report `ok`
- `/` to return a successful storefront response
- `/admin/` to return a successful administrator response or login shell

## hPanel connection checklist

1. Open **Websites → BJ Electronics → Dashboard**.
2. Select **Connect to GitHub** or **Change repository**.
3. Authorize the Hostinger GitHub application for the repository.
4. Select `workspacesarindustriesltd-creator/project-bjelectronics`.
5. Select the `main` branch.
6. Set Node.js to `22.x`.
7. Confirm the build command, output directory and entry file listed above.
8. Add the production environment variables.
9. Enable automatic deployment.
10. Run one manual redeployment after changing environment variables or build settings.

## Deployment acceptance checks

A deployment is complete only when all of the following are true:

- GitHub `CI` succeeds on `main`.
- GitHub `Hostinger Deployment` creates the production artifact.
- Hostinger reports a successful build and running application.
- `https://bjelectronics.shop/` is publicly reachable.
- `https://bjelectronics.shop/api/health` reports a healthy database.
- `https://bjelectronics.shop/admin/` loads the administrator login or authenticated dashboard.

An HTTP `403` response means the GitHub build may be valid but the Hostinger application, routing, permissions or domain connection is not yet publicly deployed.
