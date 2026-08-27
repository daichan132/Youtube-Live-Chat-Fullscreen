# Contributing

Bug reports, focused feature proposals, documentation fixes, translations, and pull requests are welcome.

## Development setup

Use Node.js 24 (pinned in `mise.toml`) and the Yarn version declared in `package.json`.

```bash
corepack enable
yarn install
yarn dev
```

`yarn dev` starts the Chrome development build. Use `yarn dev:firefox` for Firefox.

If you plan to run Playwright tests, install a browser once:

```bash
yarn playwright install --with-deps chromium
```

## Before opening a pull request

Run the checks that match the change:

```bash
yarn check
yarn test:unit
yarn build
```

`yarn check` is more than a linter. It runs Biome and `tsc --noEmit`, then four contract verifiers covering the release workflow shape, the runtime architecture rules, the 55 store listing manuscripts, and generated locale freshness. A failure like `Runtime architecture contract failed` comes from one of those; the rules it enforces are listed in [`docs/architecture/content-runtime.md`](docs/architecture/content-runtime.md).

Run `yarn build:firefox` for changes that can affect cross-browser behavior. Runtime behavior changes should also run the relevant deterministic Playwright project described in [`docs/testing/contracts.md`](docs/testing/contracts.md).

### Gates those three commands do not reproduce

CI applies more than the commands above. If your change touches one of these areas, run the matching command locally rather than discovering it in review.

| If your change | Run | Because |
| --- | --- | --- |
| Adds or removes code paths | `yarn test:coverage` | CI enforces coverage thresholds from `vitest.coverage.ts`. Plain `yarn test:unit` does not evaluate them. |
| Touches `yarn.lock` | `yarn verify:dependency-age` | New npm versions younger than 72 hours are rejected. This is a supply-chain guard, not a style rule. |
| Touches the manifest, permissions, locales, or build output | `yarn test:package` | Package contracts pin the permission set, the locale inventory, and what may appear in a release ZIP. |
| Changes anything visible | `yarn test:visual` | See the note on baselines below. |
| Changes markup, focus order, or labels | `yarn test:accessibility` | |
| Edits a file under `.github/workflows/` | `yarn check` | A verifier asserts the release workflows' shape; even reformatting the `on:` block can fail it. |

Keep pull requests focused. Avoid mixing runtime behavior, broad formatting, dependency updates, and documentation changes unless they are required by the same outcome.

If your change alters behavior a document describes, update the document in the same pull request. Nothing checks the prose automatically — see [`docs/README.md`](docs/README.md).

## Code style

Biome handles formatting and linting: single quotes, no semicolons, arrow parentheses only when needed, two-space indent, 140-column lines. `yarn fix` applies the safe fixes.

Biome is configured to cover `./entrypoints` and `./shared` only. Code under `scripts/`, `e2e/`, and `tests/` is not formatted by any tool, so match the style of the surrounding file.

A lefthook pre-commit hook runs `biome check --apply` on staged files, so your staged output may be rewritten at commit time.

## Tests

Vitest routes specs to a project by filename:

| Name it | Runs in | Environment |
| --- | --- | --- |
| `*.unit.spec.ts` | `core` | node |
| `*.dom.spec.ts` / `*.dom.spec.tsx` | `dom` | jsdom |
| `*.contract.spec.ts` | `contracts` | node |

Use one of those three for new tests. A plainly named `foo.spec.ts` under `entrypoints/` or `shared/` is swept into the jsdom project silently, which is rarely what you want for pure logic.

New Playwright scenarios must be registered in `e2e/config/projectClassification.ts`. An unregistered, double-registered, or misplaced scenario fails a contract test whose message will not obviously point back at your new file.

Which layer should prove what is documented in [`docs/testing/contracts.md`](docs/testing/contracts.md).

## Translations

Runtime translations live in `shared/i18n/assets/*.json`. Update the source locale files, regenerate derived assets, and verify them:

```bash
node scripts/generate-locales.mjs
yarn locales:check
```

Do not edit `public/locales`, `public/_locales`, or `shared/i18n/generated` by hand. The generator deletes and rewrites those directories on every run.

Three constraints are enforced by the compiler and will stop the build:

- **Every locale must carry English's exact key set.** Adding a key to `en.json` alone fails with `Locale keys differ: <locale>`. All 55 files change together.
- **A new locale needs an entry in `shared/i18n/language_codes.json`.** Without it the compiler refuses to run. Adding a language touches more than these two files — see [`docs/architecture/i18n.md`](docs/architecture/i18n.md) for the complete list.
- **`extensionName` and `extensionDescription` are store listing copy**, capped at 75 and 132 characters and validated against the manuscripts in `docs/store-listing/`. Editing them can fail `yarn check` for reasons that look unrelated to translation.

Translations of the README itself go to `docs/translations/README.<locale>.md`.

## Screenshots

Store and documentation screenshots are captured by the dedicated Playwright project:

```bash
yarn capture:store-assets
```

Review every changed image at full size. Do not update visual baselines to hide an unexplained rendering difference.

Visual baselines are pinned to Ubuntu with the Playwright-bundled Chromium, which is what CI runs. Baselines regenerated on macOS will differ and will fail CI. If a baseline genuinely needs updating, say so in the pull request and let CI produce the diff rather than committing a locally captured replacement.

## Reporting bugs

Use the [bug report form](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml) and include the browser, extension version, YouTube URL type, reproduction steps, and screenshots or recordings when available.

Which video state you were on — live, archive with replay, or no chat — is the single most useful detail, because those are distinct runtime paths. The settings panel can also copy a sanitized diagnostic report; it excludes URLs, video IDs, chat text, and user names before it reaches your clipboard.

Common fixes are collected in [`docs/troubleshooting.md`](docs/troubleshooting.md).

Security vulnerabilities must follow [SECURITY.md](SECURITY.md), not a public issue.
