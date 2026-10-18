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

For a larger feature or a change to permissions or storage, open an issue first so the intended behavior can be discussed before implementation. Report security vulnerabilities privately through [SECURITY.md](SECURITY.md).

For a small code contribution, start with a behavior you can see and test on its own. [`compileStylePatch.ts`](entrypoints/content/style/compileStylePatch.ts) turns appearance settings into CSS properties; its [unit tests](entrypoints/content/style/compileStylePatch.unit.spec.ts) cover colors, fonts, spacing, and blur without opening a browser. For runtime logic, [`resolveChatDecision.ts`](entrypoints/content/runtime/resolveChatDecision.ts) and its [tests](entrypoints/content/runtime/resolveChatDecision.unit.spec.ts) show how the extension distinguishes live chat, replay, loading, and unavailable chat.

## Run a development build

Fork and clone the repository, then run these commands from its root. Use Node.js 24 and the Yarn version in [`package.json`](package.json); Corepack selects that pinned version. If `corepack` is unavailable, follow [Corepack's installation instructions](https://github.com/nodejs/corepack#how-to-install).

```bash
corepack enable
yarn install --immutable
yarn dev
```

Dependency install scripts are disabled by default in [`.yarnrc.yml`](.yarnrc.yml). The `dependenciesMeta` allowlist in [`package.json`](package.json) enables only `esbuild` and `lefthook`, which need their installation steps. Review a dependency's install scripts before adding it to this allowlist; do not enable scripts globally to resolve an installation warning. The repository's own setup scripts still run.

To load the development build in regular Google Chrome:

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Select **Load unpacked** and choose `.output/chrome-mv3-dev` from this repository.
3. Open a YouTube live stream or an archive with chat replay, reload the YouTube tab, and enter fullscreen.

Keep `yarn dev` running while trying changes. After reloading the extension in `chrome://extensions`, also reload the YouTube tab. For Firefox, use `yarn dev:firefox`. The [browser verification guide](docs/maintainers/verification-browser.md) has additional instructions for dedicated Chrome profiles, production builds, and recording browser checks.

Install Playwright Chromium once before browser tests:

```bash
yarn playwright install --with-deps chromium
```

## Try a focused test

After installing dependencies, run the appearance compiler's tests:

```bash
yarn test:core entrypoints/content/style/compileStylePatch.unit.spec.ts
```

Follow a setting such as `fontSize` from the input profile to the expected CSS property. This is a small path through the code before working on the UI or YouTube's DOM.

To try a browser scenario, build the testing extension and run the archive restore fixture:

```bash
yarn build:e2e
yarn playwright test --project=fixture e2e/scenarios/archive/borrowRestore.fixture.spec.ts --workers=1
```

This uses a synthetic YouTube page and the actual extension. It enters fullscreen, borrows the replay iframe, then checks that leaving fullscreen returns it to its original position with its native styles. It needs no active stream or YouTube login. Set `YLC_E2E_HEADED=1` before the Playwright command to show the browser while it runs.

The [scenario file](e2e/scenarios/archive/borrowRestore.fixture.spec.ts) describes the page state and expected result; the shared [scenario tools](e2e/support/youtubeScenario/) create the page. You can use that pattern to add a reproducible case for a focused bug fix. These focused checks help during development; complete the required checks below before opening the pull request.

## Verify your change

For code, configuration, or dependency changes, run the required local checks:

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

For documentation-only changes, check links, commands, and the diff. You do not need to run the complete source suite. For interface-string translations, use the generation and locale checks below.

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

Choose assertions using the [test review criteria](docs/testing/contracts.md#choosing-assertions): start with the behavior being protected, derive expectations from its contract, and check that a representative fault makes the test fail. Coverage alone does not show that a test detects incorrect behavior.

Use an explicit `*.unit.spec.ts(x)`, `*.dom.spec.ts(x)`, or `*.contract.spec.ts(x)` suffix for new Vitest tests. The [testing guide](docs/testing/contracts.md) describes each project and how to run focused checks. `test.only` and `describe.only` markers are rejected unless `YLC_ALLOW_ONLY=1` is explicitly set for local debugging. Selecting a test file on the command line does not require that variable.

Register each Playwright scenario exactly once in [`e2e/config/projectClassification.ts`](e2e/config/projectClassification.ts). Keep real-YouTube canaries separate from deterministic fixtures.

## Formatting and type safety

```bash
yarn check
yarn fix
```

Biome owns source formatting and linting; TypeScript runs with `tsc --noEmit`. `yarn check` does not replace `yarn verify`. Do not suppress errors to make checks pass.

## Translations

### Interface strings

Edit `shared/i18n/assets/*.json`, then regenerate and verify:

```bash
node scripts/generate-locales.mjs
yarn locales:check
```

Do not edit generated files under `public/locales`, `public/_locales`, or `shared/i18n/generated` by hand.

### Documentation

The [documentation index](docs/README.md#use-the-extension) lists the reader guides available in each language. Use the English page as the reference and follow the [documentation translation rules](docs/README.md#maintain-translated-guides) when editing or adding a translation. Check displayed control names against the corresponding interface JSON.

Documentation translations are Markdown files under `docs/translations/`. They are maintained separately from interface strings and do not require locale generation. Check their links, images, and meaning against the English page before opening a pull request.

## Screenshots

Start with the [selected store assets](docs/store-assets/chrome-web-store/README.md) for the approved images, retained sources, and preview tools. Check the selected files without launching a browser:

```bash
yarn store:assets:render --check
```

For fresh captures from real YouTube, use the separate store-asset capture project:

```bash
yarn capture:store-assets
```

This writes PNGs to the ignored `screenshots/` directory at the repository root. It does not replace the selected store assets.

Review changed images at full size. Do not update visual baselines to hide an unexplained difference.
