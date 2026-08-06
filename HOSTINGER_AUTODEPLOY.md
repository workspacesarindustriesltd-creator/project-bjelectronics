# Hostinger automatic deployment

BJ Electronics is configured as a managed Express.js and Vite Node.js application for Hostinger Business or Cloud hosting.

## Production source

- Repository: `workspacesarindustriesltd-creator/project-bjelectronics`
- Production branch: `main`
- Runtime: Node.js `22.x`
- Install command: `npm ci`
- Build command: `npm run hostinger:build`
- Output directory: `dist`
- Entry file: `index.js`
- Start command: `npm start`

Hostinger's native GitHub integration must be connected to this repository and the `main` branch. Once connected, every push to the selected branch starts an automatic Hostinger build and deployment. Production changes should reach `main` only through a pull request whose `CI` checks pass.

## One-time hPanel configuration

1. Open **Websites → BJ Electronics → Dashboard**.
2. Select **Connect to GitHub**. If another repository is connected, use **Change repository**.
3. Authorize the Hostinger GitHub application for `workspacesarindustriesltd-creator/project-bjelectronics`.
4. Select the `main` branch.
5. Choose framework type **Other** if Hostinger does not detect the combined Express.js and Vite application correctly.
6. Set Node.js to `22.x`.
7. Set the install command to `npm ci`.
8. Set the build command to `npm run hostinger:build`.
9. Set the output directory to `dist`.
10. Set the entry file to `index.js`.
11. Set the start command to `npm start` when the field is available.
12. Import the production environment variables in hPanel. Never commit production values to GitHub.
13. Deploy once and confirm the application is connected to GitHub.

After this connection exists, a merge or direct push to `main` automatically starts a new Hostinger deployment. No GitHub deployment webhook or SSH secret is required for Hostinger's native Node.js GitHub integration.

## Production environment variables

Copy the required variable names from `deploy/hostinger-business.env.example` into the Hostinger application environment and replace every placeholder in hPanel.

Required production groups include:

- public application and administrator URLs
- Hostinger MySQL `DATABASE_URL`
- session and audit secrets
- administrator vault encryption key
- initial administrator credentials used for the first seed only

Never add `.env`, database credentials, passwords, API keys or vault keys to GitHub Actions secrets unless a workflow explicitly needs them. The native Hostinger integration reads production environment variables from hPanel, not from this repository.

## GitHub release workflow

`.github/workflows/hostinger-deployment.yml` runs after the `CI` workflow succeeds for `main`.

It performs these operations:

1. Checks out the exact revision verified by `CI`.
2. Installs the locked dependency graph using Node.js 22.
3. Runs the complete Hostinger production build, tests and dependency audit.
4. Validates the generated runtime entry files and Node.js engine.
5. Creates a checksum-protected `hostinger-production.tgz` artifact.
6. Uploads the artifact to GitHub Actions for 14 days.
7. Records that Hostinger's native GitHub integration is responsible for the actual deployment.
8. Optionally waits for and verifies the public application after deployment.

The GitHub artifact is a reproducible backup and audit record. Hostinger deploys from the connected repository branch rather than downloading this Actions artifact.

## GitHub Actions configuration

Open **Settings → Secrets and variables → Actions → Variables** and add:

```text
PRODUCTION_BASE_URL=https://bjelectronics.shop
HOSTINGER_HEALTHCHECK_ENABLED=true
```

Set `HOSTINGER_HEALTHCHECK_ENABLED=true` only after the Hostinger application, DNS and MySQL connection are live. When enabled, the workflow verifies:

- `/api/health` returns `ok` or `degraded`
- the database dependency reports `ok`
- `/` returns a successful storefront response
- `/admin/` returns the administrator login or authenticated application shell

No `HOSTINGER_DEPLOY_WEBHOOK_URL` secret is required for the native Node.js GitHub integration.

## Branch protection

Protect `main` in **Settings → Branches** or **Rulesets** with these minimum controls:

- require a pull request before merging
- require the `CI / verify` status check
- require the branch to be up to date before merging
- block force pushes
- block branch deletion

This prevents an unverified commit from becoming the production branch that Hostinger watches.

## Deployment acceptance checks

A production release is complete only when all of the following are true:

- the pull request checks pass
- the change is merged into `main`
- Hostinger reports a successful build and running Node.js application
- `https://bjelectronics.shop/` is publicly reachable
- `https://bjelectronics.shop/api/health` reports a healthy database
- `https://bjelectronics.shop/admin/` loads the administrator interface

If GitHub succeeds but the public site does not update, verify that hPanel is connected to this exact repository and the `main` branch, then inspect the latest Hostinger deployment log. Environment-variable changes require a Hostinger redeployment.
