# Contributing

Bug reports, focused feature proposals, documentation fixes, translations, and pull requests are welcome.

## Setup

Use Node.js 24 and the Yarn version pinned by the repository.

```bash
corepack enable
yarn install --immutable
yarn dev
```

Use `yarn dev:firefox` for Firefox. Install Playwright Chromium once before browser tests:

```bash
yarn playwright install --with-deps chromium
```

## Before opening a pull request

Run the local gate:

```bash
yarn verify
```

For package, manifest, Firefox-source, or release changes, also run:

```bash
yarn test:package
yarn verify:firefox-source
```

For runtime behavior, run the relevant deterministic browser project. The real-YouTube canary is reserved for compatibility checks and release preparation; it is not a substitute for deterministic fixtures.

Pull requests automatically run source/coverage/contracts, production package checks, deterministic Playwright fixtures, and accessibility checks. The manual CI workflow adds visual checks and exact packaged startup smoke. Local verification remains the fastest way to diagnose failures.

## Change discipline

- Keep one clear outcome per pull request, but include all code, tests, migration compatibility, and documentation required by that outcome.
- Do not add a background service worker, permission, web-accessible resource, or page-to-extension message without explaining why the existing boundaries are insufficient.
- YouTube DOM changes belong in the platform adapter and selector catalog, not as selectors scattered through UI code.
- Every borrowed page mutation must have an idempotent restore path.
- Storage changes must state their write owner and compatibility behavior. Same-domain concurrent edits use last-write-wins; the project does not implement distributed merging.
- Update prose in the same pull request when behavior changes.

## Tests

Vitest uses three projects:

| Test | Environment | Use for |
| --- | --- | --- |
| `*.unit.spec.ts(x)` | Node | Pure logic |
| `*.dom.spec.ts(x)` and legacy/plain source `*.spec.ts(x)` | jsdom | React, DOM, storage, and runtime integration |
| `*.contract.spec.ts(x)` plus contract directories | Node | Package, workflow, and architecture contracts |

The DOM project runs with `https://www.youtube.com/` as its document URL so origin-sensitive route behavior matches production. Unit and contract suffixes are explicitly excluded from the DOM wildcard.

Focused tests are rejected unless `YLC_ALLOW_ONLY=1` is explicitly set for local debugging.

Playwright scenarios are explicitly classified in `e2e/config/projectClassification.ts`. Register each scenario exactly once and keep real-YouTube canaries separate from deterministic fixtures.

## Formatting and type safety

```bash
yarn check
yarn fix
```

Biome owns source formatting and linting; TypeScript runs with `tsc --noEmit`. `yarn check` does not replace the broader `yarn verify` gate. Do not suppress errors to make a gate pass.

## Translations

Edit `shared/i18n/assets/*.json`, then regenerate and verify:

```bash
node scripts/generate-locales.mjs
yarn locales:check
```

Do not edit generated files under `public/locales`, `public/_locales`, or `shared/i18n/generated` by hand.

## Screenshots

```bash
yarn capture:store-assets
```

Review changed images at full size. Do not update visual baselines to hide an unexplained difference.

## Bug reports

Include the browser, extension version, URL type (`/watch`, direct live entry, channel live entry, archive replay, or no chat), reproduction steps, and screenshots or recordings. The settings panel can copy a sanitized diagnostic report that excludes URLs, video IDs, chat text, and user names.

Report security vulnerabilities privately through [SECURITY.md](SECURITY.md), not a public issue.
