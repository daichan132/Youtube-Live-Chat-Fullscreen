# Test contract matrix

Tests are separated by the boundary they prove. Pull-request gates stay deterministic; real YouTube compatibility belongs in the canary layer.

| Behavior | Core (`node`) | DOM (`jsdom`) | Fixture E2E | Package contract (`node`) | Real YouTube canary |
| --- | --- | --- | --- | --- | --- |
| Live/archive/no-chat decision | Primary | DOM observation | Representative lifecycle |  | Compatibility only |
| iframe borrow/restore | Decision state | Primary DOM ownership | Representative lifecycle |  | Representative smoke |
| settings normalize/migration | Primary | Storage synchronization | One round trip |  |  |
| overlay geometry/style | Primary | User interaction | Representative browser boundary |  |  |
| popup/content messaging | Message shape | Primary extension API boundary | One round trip |  |  |
| locales and permissions | Locale resolution | Provider rendering | Representative locales | Primary inventory/manifest policy |  |

## Commands

Unit and contract layers:

- `yarn test:core`: pure logic and data contracts in Node.
- `yarn test:dom`: React, DOM, and extension API integration in jsdom. WXT's fake browser is reset for every test in this project only.
- `yarn test:contracts`: Node-side source and configuration contracts. It does not require pre-existing `.output` artifacts.
- `yarn test:unit`: compatibility gate that runs all three Vitest projects.
- `yarn test:coverage`: runs the core and DOM projects with coverage, then verifies the coverage contract. This is what CI evaluates thresholds with; `test:unit` does not.
- `yarn test:package`: freshly builds and packages production Chrome/Firefox extensions, then verifies their manifests, locale inventory, file inventory, and ZIP contents.

Browser layers. Every command below except `e2e:production:chrome` rebuilds the testing extension first:

- `yarn build:e2e`: creates `.output/chrome-mv3-testing` with the storage bridge required by Playwright. Production builds never contain this bridge.
- `yarn e2e` / `yarn e2e:fixture`: popup and synthetic YouTube fixtures only. External HTTP(S) requests are blocked, retries are disabled, and this is the pull-request gate.
- `yarn test:visual`: the deterministic visual regression project.
- `yarn test:accessibility`: the deterministic accessibility project.
- `yarn e2e:production:chrome`: extracts the versioned production Chrome ZIP and boots its popup and content runtime without the testing bridge. It overrides the extension directory to `.output/production-smoke/chrome`.
- `yarn e2e:canary`: five real YouTube compatibility checks for live, archive, navigation, managed fallback, and no-chat boundaries. URL discovery and environment-dependent skips remain isolated here; replay-unavailable is owned by the deterministic fixture.
- `yarn e2e:live` / `yarn e2e:archive`: the same canary project narrowed by the `@live` / `@archive` tags.
- `yarn capture:store-assets` (aliased as `yarn screenshots`): captures store-listing assets through the `store-assets` Playwright project, pinned to a single worker.

Playwright needs a browser binary, which nothing installs implicitly: `yarn playwright install --with-deps chromium`.

## Where a test belongs

New Vitest specs should use `*.unit.spec.ts`, `*.dom.spec.ts(x)`, or `*.contract.spec.ts`. Two details about how the routing actually works:

- Twenty-two older core specs are listed by path in `vitest.config.ts` to avoid a risky bulk rename. Everything else under `entrypoints/` and `shared/` is swept into the **dom** project by wildcard, so a plainly named new spec lands in jsdom without any config edit. That is the opposite of what the naming convention suggests, so name new files explicitly.
- The contracts project also sweeps whole directories, not just the `*.contract.spec.ts` suffix: `e2e/config/**/*.spec.ts`, `e2e/support/**/*.spec.ts`, and `scripts/verify/**/*.spec.mjs`. A new spec under `e2e/support/` is enrolled in the contracts gate automatically. There are a few hand-routed exceptions in `vitest.config.ts`, and unlike the Playwright side, nothing enforces that a Vitest spec belongs to exactly one project.

Playwright scenarios are explicitly listed in `e2e/config/projectClassification.ts`. Its Node/Vitest contract fails when a scenario is missing, classified twice, or placed in the deterministic project without the `.fixture.spec.ts` or popup boundary. Tags remain descriptive and may narrow a canary command, but they do not decide which project owns a test.

Deterministic YouTube specs use the typed API in `e2e/support/youtubeScenario/`. That boundary owns fixture HTML, request routing, YouTube DOM mutation, fullscreen control, and identity/order observations; scenario specs describe state and assertions without embedding raw DOM operations.

The canary's real YouTube targets live in `e2e/config/testTargets.ts`, overridable through `YLC_LIVE_URL`, `YLC_ARCHIVE_URL`, `YLC_ARCHIVE_NEXT_URL`, and `YLC_NOCHAT_URL`, with live discovery falling back to search. That is the file to edit when a pinned archive or no-chat video rots.

## Production/testing package boundary

`e2e/assets/e2e.html` is added by WXT only in `testing` mode. Most Playwright projects load `.output/chrome-mv3-testing`; the `production-chrome` project instead points `YLC_EXTENSION_OUTPUT_DIR` at the extracted production build and sets `YLC_REQUIRE_E2E_BRIDGE=0`. Release and package scripts consume `.output/chrome-mv3` and `.output/firefox-mv2`. The package contract rejects the E2E bridge, source maps, test files, and fixture assets in both unpacked production output and ZIP files, and requires the sources ZIP to contain only git-tracked files.

## CI ownership

- `quality` owns the dependency release-age gate, generated locale checks, source checks, coverage, and Node-side contract tests. The age gate runs before install and can block a pull request on its own.
- `package` owns fresh Chrome/Firefox production builds and ZIPs, the production package contract, and the exact testing extension artifact used by browser checks.
- `browser-contracts` downloads that testing artifact and runs fixture, visual, and accessibility projects with retries disabled and `--max-failures=1`, so a failing run stops at the first failure and the report will look truncated.
- `production-package-smoke` downloads the exact Chrome ZIP built by `package`, extracts it, and boots the packaged popup and content runtime without test-only assets.
- The release-candidate workflow independently rebuilds and verifies production packages, runs deterministic browser contracts, boots the exact Chrome ZIP, and runs a strict real-YouTube canary against that extracted ZIP.
- A passing candidate produces `release-proof-v<version>.json` with the source commit, exact artifact SHA-256 hashes, required gates, and regression invariants. The ZIPs and proof are attached to a draft GitHub Release.
- Store publication is a separate manual workflow. It downloads the draft assets, verifies their hashes and tag commit, passes through the `chrome-web-store` and `firefox-add-ons` environments, and never rebuilds the artifacts. Naming an environment in YAML does not itself create an approval policy; repository administrators must configure required reviewers.
- `scripts/verify/check-release-workflow.mjs` runs inside `yarn check` on every pull request and asserts the release workflows' own shape — no push trigger on the candidate workflow, the attestation inputs, draft-only release creation, no rebuild in publish, both environment names, and the dependency between the publish jobs. Editing a workflow file usually means editing this script too.

## Canary classification

The scheduled canary and the release lane read the same reporter but treat its output differently.

| Outcome | Scheduled monitor (`canary.yml`) | Release candidate (`cd.yml`) |
| --- | --- | --- |
| All tests passed | green | accepted |
| Some executed, some skipped or flaky; fingerprint drift | green, reported as degraded | **rejected** — the job stops, no tag and no draft are produced |
| Every test skipped | fails the run | **accepted** as `unavailable` |
| Assertion failure, timeout, interruption | fails the run | rejected |

The all-skipped case deserves attention: a release candidate whose canary executed zero tests still produces a signed proof and a publishable draft. The `github-hosted-real-youtube-canary` gate is recorded as `unavailable`, and the publish-side verifier deliberately does not require it. In that situation the human real-browser attestation required by the release workflow is the release's only real-YouTube evidence. There is currently no flag to force strictness — `YLC_CANARY_REQUIRE_CLEAN` is read by the reporter but set nowhere in the repository.

Canary skips are limited to YouTube-owned preconditions. Once a usable source and fullscreen state exist, missing extension UI or chat is a test failure. The workflow writes executed/skipped/failed counts to the job summary and retains Playwright diagnostics.

Operator-facing handling of each outcome is in [`../maintainers/release-runbook.md`](../maintainers/release-runbook.md).

## Visual baselines

Visual baselines are evaluated in CI on Ubuntu with the installed Playwright Chromium. Baselines must therefore be captured and approved for that environment; a baseline regenerated on macOS will fail. Initial OS rendering differences are baseline-alignment work, not a reason to loosen deterministic thresholds.

The blur contract is metamorphic rather than baseline-only: a high-frequency player surface must lose edge energy inside the bounded chat background when blur changes from 0 to 16px, while an outside sample stays within a near-identity threshold. This catches a syntactically valid `backdrop-filter` attached to the wrong compositor layer.
