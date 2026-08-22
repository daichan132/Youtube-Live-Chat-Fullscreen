# Test contract matrix

Tests are separated by the boundary they prove. Pull-request gates should stay deterministic; real YouTube compatibility belongs in the canary layer.

| Behavior | Core (`node`) | DOM (`jsdom`) | Fixture E2E | Package contract (`node`) | Real YouTube canary |
| --- | --- | --- | --- | --- | --- |
| Live/archive/no-chat decision | Primary | DOM observation | Representative lifecycle |  | Compatibility only |
| iframe borrow/restore | Decision state | Primary DOM ownership | Representative lifecycle |  | Representative smoke |
| settings normalize/migration | Primary | Storage synchronization | One round trip |  |  |
| overlay geometry/style | Primary | User interaction | Representative browser boundary |  |  |
| popup/content messaging | Message shape | Primary extension API boundary | One round trip |  |  |
| locales and permissions | Locale resolution | Provider rendering | Representative locales | Primary inventory/manifest policy |  |

## Commands

- `yarn test:core`: pure logic and data contracts in Node.
- `yarn test:dom`: React, DOM, and extension API integration in jsdom. WXT's fake browser is reset for every test in this project only.
- `yarn test:contracts`: Node-side source/configuration contracts. It does not require pre-existing `.output` artifacts.
- `yarn test:coverage`: runs the core and DOM projects with coverage, then verifies the coverage contract.
- `yarn test:package`: freshly builds and packages production Chrome/Firefox extensions, then verifies their manifests, locale inventory, file inventory, and ZIP contents.
- `yarn build:e2e`: creates `.output/chrome-mv3-testing` with the storage bridge required by Playwright. Production builds never contain this bridge.
- `yarn test:unit`: compatibility gate that runs all three Vitest projects.
- `yarn e2e` / `yarn e2e:fixture`: builds the testing extension and runs only popup and synthetic YouTube fixtures. External HTTP(S) requests are blocked, retries are disabled, and this is the pull-request gate.
- `yarn e2e:canary`: builds the testing extension and runs five real YouTube compatibility checks for live, archive, navigation, managed fallback, and no-chat boundaries. URL discovery and environment-dependent skips remain isolated here; replay-unavailable is owned by the deterministic fixture.
- `yarn test:visual`: runs the deterministic visual regression project.
- `yarn e2e:production:chrome`: extracts the versioned production Chrome ZIP and boots its popup and content runtime without the testing bridge.
- `yarn test:accessibility`: runs the deterministic accessibility project.
- `yarn screenshots`: builds the testing extension and runs the separate screenshot project.
- `yarn capture:store-assets`: captures store-listing assets through its dedicated Playwright project.

New tests should use `*.unit.spec.ts`, `*.dom.spec.ts(x)`, or `*.contract.spec.ts`. Existing tests remain named as-is and are classified explicitly in `vitest.config.ts` to avoid a risky bulk rename.

Playwright scenarios are explicitly listed in `e2e/config/projectClassification.ts`. Its Node/Vitest contract fails when a scenario is missing, classified twice, or placed in the deterministic project without the `.fixture.spec.ts` or popup boundary. Tags remain descriptive and may narrow a canary command, but they do not decide which project owns a test.

Deterministic YouTube specs use the typed API in `e2e/support/youtubeScenario/`. That boundary owns fixture HTML, request routing, YouTube DOM mutation, fullscreen control, and identity/order observations; scenario specs describe state and assertions without embedding raw DOM operations.

## Production/testing package boundary

`e2e/assets/e2e.html` is added by WXT only in `testing` mode. Playwright loads `.output/chrome-mv3-testing`; release and package scripts consume `.output/chrome-mv3` and `.output/firefox-mv2`. The package contract rejects the E2E bridge, source maps, test files, and fixture assets in both unpacked production output and ZIP files.

## CI ownership

- `quality` owns generated locale checks, source checks, coverage, and Node-side contract tests.
- `package` owns fresh Chrome/Firefox production builds and ZIPs, the production package contract, and the exact testing extension artifact used by browser checks.
- `browser-contracts` downloads that testing artifact and runs fixture, visual, and accessibility projects with retries disabled.
- `production-package-smoke` downloads the exact Chrome ZIP built by `package`, extracts it, and boots the packaged popup and content runtime without test-only assets.
- The release-candidate workflow independently rebuilds and verifies production packages, runs deterministic browser contracts, boots the exact Chrome ZIP, and runs a strict real-YouTube canary against that extracted ZIP. Skipped, flaky, or degraded canary evidence rejects the candidate.
- A passing candidate produces `release-proof-v<version>.json` with the source commit, exact artifact SHA-256 hashes, required gates, and regression invariants. The ZIPs and proof are attached to a draft GitHub Release.
- Store publication is a separate manual workflow. It downloads the draft assets, verifies their hashes and tag commit, passes through protected Chrome and Firefox environments, and never rebuilds the artifacts.
- Repository administrators must configure required reviewers for the `chrome-web-store` and `firefox-add-ons` GitHub environments; naming an environment in YAML does not itself create an approval policy.
- The canary workflow remains responsible for compatibility with the changing real YouTube surface; it is not a deterministic pull-request gate. Scheduled runs report retries, external skips, and fingerprint-only drift as degraded evidence without turning the monitor red. Final assertion failures, timeouts, interruptions, and all-skipped runs still fail. The strict release-candidate lane rejects degraded evidence as well.
- Canary skips are limited to YouTube-owned preconditions. Once a usable source and fullscreen state exist, missing extension UI or chat is a test failure. The workflow writes executed/skipped/failed counts to the job summary and retains Playwright diagnostics.

Visual baselines are evaluated in CI on Ubuntu with the installed Playwright Chromium. Baselines must therefore be captured and approved for that environment. Initial OS rendering differences are baseline-alignment work, not a reason to loosen deterministic thresholds.

The blur contract is metamorphic rather than baseline-only: a high-frequency player surface must lose edge energy inside the bounded chat background when blur changes from 0 to 16px, while an outside sample remains pixel-identical. This catches a syntactically valid `backdrop-filter` that is attached to the wrong compositor layer.
