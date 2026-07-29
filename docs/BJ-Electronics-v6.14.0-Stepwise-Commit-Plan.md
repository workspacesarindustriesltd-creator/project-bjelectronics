# BJ Electronics v6.14.0 stepwise Git upgrade

## Target

- Repository: `workspacesarindustriesltd-creator/project-bjelectronics`
- Base branch: `main`
- Upgrade branch: `agent/upgrade-bj-electronics-v6.14.0`
- Release: `BJ-Electronics-Hostinger-Business-Web-Hosting-v6.14.0-Responsive-Commerce-UX.zip`
- `main` remains unchanged until a later reviewed merge.

## Commit sequence

1. `chore: establish BJ Electronics v6.14.0 foundation`
   - Package manifests and lockfile
   - Environment examples and ignore rules
   - Vite, Docker, and HTML entry configuration

2. `feat: upgrade storefront and admin interface`
   - `src/` storefront, admin panel, design system, components, data, and configuration

3. `feat: upgrade commerce API and database`
   - `server/` API, authentication, repository layer, migrations, SQL, payments, SEO, and API tests

4. `chore: upgrade deployment build worker and tests`
   - `.openai/`, `deploy/`, `scripts/`, `tests/`, and `worker/`

5. `assets: refresh BJ Electronics storefront and brand assets`
   - `public/` product media, PWA files, logo system, icons, social cards, and SEO files

6. `docs: add BJ Electronics v6.14.0 release documentation`
   - README, Hostinger and SSLCommerz guidance, release notes, audit reports, and validation evidence

7. `chore: synchronize exact BJ Electronics v6.14.0 release tree`
   - Removes stale v3.3.0-only files
   - Re-copies the release tree and verifies every file by SHA-256
   - This commit is intentionally skipped when commits 1–6 already produce the exact release tree.

## Verification gate

The script runs these checks before pushing:

```bash
npm ci --include=dev
npm run build:diagnose
npm run security:verify
npm run brand:verify
npm run audit:code
npm test
```

The branch is pushed only after all enabled checks succeed.

## Execute

```bash
chmod +x upgrade-bj-v614-stepwise.sh

./upgrade-bj-v614-stepwise.sh \
  --archive ./BJ-Electronics-Hostinger-Business-Web-Hosting-v6.14.0-Responsive-Commerce-UX.zip \
  --push
```

Use `--workdir /path/to/existing/checkout` to operate in an existing clean clone. Use `--skip-install` or `--skip-verify` only when the runtime cannot access npm; those options reduce verification coverage and should not be used for the final production branch unless the same checks run successfully in CI.

## Fresh local validation

The script was tested against the supplied v6.14.0 ZIP using a clean bare Git remote and a preserved `.github/workflows` file.

Results:

- Safety scan: passed for 220 package files
- Content commits created: 6
- Exact-tree synchronization: no additional commit required
- Exact SHA-256 tree verification: passed for all 220 package files
- Package version after upgrade: `6.14.0`
- Existing GitHub workflow preservation: passed
- Final working tree: clean
- Base branch mutation: none

The dependency installation stage could not be completed in this environment because its configured private npm mirror did not contain `form-data@2.5.6`. Run the normal verification gate from a machine or Codespace with access to the public npm registry before merging.
