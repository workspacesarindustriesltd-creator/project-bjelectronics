# BJ Electronics UI/UX application architecture

## Production surfaces

- Storefront: `/`
- Administrator portal: `/admin/`
- API: `/api/`

The production entries use modular applications:

- `apps/store/main.jsx` → `src/store/StoreApp.jsx`
- `apps/admin/main.jsx` → `src/admin/AdminPortal.jsx`
- Shared browser networking and persistence → `src/shared/client.js`

## Storefront route inventory

Home, shop, category search, product details, cart, authenticated checkout, account authentication, account overview, orders, addresses, wishlist, comparison, tracking, help, contact, policies and not-found recovery are included. Cart, comparison and appearance persist locally. Accounts, wishlist, addresses, reviews and orders use the protected Express API.

## Administrator workspace

The protected workspace includes operational overview, order management, product creation and editing, inventory controls, customer records, coupon management, Cloudinary media, integration health, deployment settings and responsive navigation.

## Accessibility baseline

Keyboard-visible focus, skip navigation, semantic landmarks, labelled controls, dialog roles, focus restoration, Escape-key dismissal, screen-reader live regions, reduced-motion support, responsive touch targets, high-contrast light/dark themes, and loading/error/empty states are required across both applications.

## Quality controls

`server/tests/ui-platform-contract.test.mjs` verifies production entries, route coverage, real API integration, accessibility markers, responsive CSS contracts and frontend secret isolation. GitHub Actions performs the full build, API tests, bundle checks, Hostinger output validation and production dependency audit before merge.
