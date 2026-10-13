# Contributing

You can help make fullscreen chat easier to use by reporting a reproducible problem, improving a translation, clarifying a guide, or fixing a focused issue. You do not need to understand the entire runtime to get started.

## Choose a starting point

| Contribution | Where to start |
| --- | --- |
| Report a problem | Read [Troubleshooting](docs/troubleshooting.md), then use the [bug report form](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml) |
| Propose a feature | Describe the viewing situation and expected behavior in the [feature request form](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=feature.yml) |
| Improve a guide | Find the relevant page in the [documentation index](docs/README.md) |
| Improve a translation | Edit the source JSON described in [Internationalization](docs/architecture/i18n.md) |
| Change code or add a test | Use the setup below, then follow the [engineering overview](docs/engineering.md) to the relevant files |

For a larger feature or a change to permissions or storage, open an issue first so the intended behavior can be discussed before implementation.

## Run a development build

Fork and clone the repository, then run these commands from its root. Use Node.js 24 and the Yarn version in [`package.json`](package.json); Corepack selects that pinned version. If `corepack` is unavailable, follow [Corepack's installation instructions](https://github.com/nodejs/corepack#how-to-install).

```bash
corepack enable
yarn install --immutable
yarn dev
```

`yarn dev` starts the Chrome development build; `yarn dev:firefox` starts Firefox. Keep the development process running while trying changes. For a dedicated Chrome profile, loading the correct output, and checking the overlay on YouTube, follow [browser verification](docs/maintainers/verification-browser.md).

Install Playwright Chromium once before browser tests:

```bash
yarn playwright install --with-deps chromium
```

## Verify your change

For code, configuration, or dependency changes, run the local gate:

```bash
yarn verify
```

For package, manifest, Firefox-source, or release changes, also run:

```bash
yarn test:package
yarn verify:firefox-source
```

For runtime behavior, also run the deterministic fixtures:

```bash
yarn e2e:fixture
```

While iterating, you can run a relevant classified scenario after `yarn build:e2e`. The [testing guide](docs/testing/contracts.md) explains the projects and additional gates. The real-YouTube canary is reserved for compatibility checks and release preparation; it is not a substitute for deterministic fixtures.

For documentation-only changes, check links, commands, and the diff. You do not need to run the complete source suite. For translations, use the generation and locale checks below.

Pull requests automatically run source/coverage/contracts, production package checks, deterministic Playwright fixtures, and accessibility checks. The manual CI workflow adds visual checks and exact packaged startup smoke.

## Open a pull request

Explain the problem, the resulting behavior, and the checks you ran. Include before/after screenshots or a short recording for a visible change. Note any browser or scenario you could not verify. Link the related issue when there is one.

Preserve live streams, archives with replay, videos without chat, and YouTube navigation without a full page reload. The release workflows, version bump, tags, and store submission are maintainer tasks and should be separate from a contribution.

## Change discipline

- Keep one clear outcome per pull request, but include all code, tests, migration compatibility, and documentation required by that outcome.
- Do not add a background service worker, permission, web-accessible resource, or page-to-extension message without explaining why the existing boundaries are insufficient.
- YouTube DOM changes belong in the [platform adapter](entrypoints/content/platform/youtube/) and [selector catalog](entrypoints/content/platform/youtube/selectorCatalog.ts), not as selectors scattered through UI code.
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

New Vitest tests use an explicit unit, DOM, or contract suffix. Playwright scenarios are explicitly classified in [`e2e/config/projectClassification.ts`](e2e/config/projectClassification.ts). Register each scenario exactly once and keep real-YouTube canaries separate from deterministic fixtures.

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

Use the store-asset capture project when updating the listing screenshots:

```bash
yarn capture:store-assets
```

Review changed images at full size. Do not update visual baselines to hide an unexplained difference.

## Useful bug reports

Include the browser and OS versions, extension version, video state (live, replay, or no chat), route type (`/watch`, direct live entry, or channel live entry), reproduction steps, and screenshots or recordings. The settings panel can copy a sanitized diagnostic report that excludes URLs, video IDs, chat text, and user names. Remove personal information from any other evidence you attach.

Report security vulnerabilities privately through [SECURITY.md](SECURITY.md), not a public issue.
