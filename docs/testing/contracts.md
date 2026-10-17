# Test contract matrix

Tests are separated by the boundary they prove. Pull-request source and package gates stay deterministic; real YouTube compatibility remains in the canary layer.

| Behavior | Core (`node`) | DOM (`jsdom`) | Fixture E2E | Package contract | Real YouTube canary |
| --- | --- | --- | --- | --- | --- |
| URL and live/archive/no-chat decision | Primary | Observation integration | Representative routes and lifecycle |  | Compatibility only |
| iframe borrow/restore | Pure transition rules | Primary ownership behavior | Exact browser lifecycle |  | Representative smoke |
| settings normalize/migration | Primary | Storage synchronization | Representative round trip |  |  |
| overlay geometry/style | Placement math | Pointer/observer behavior | Browser boundary |  |  |
| popup/content messaging | Payload shape | Extension API integration | One round trip |  |  |
| locales and permissions | Locale resolution | Rendering | Representative locale UI | Primary inventory/manifest policy |  |

## Choosing assertions

Start from a user-visible outcome or a documented boundary. Expected values should come from that contract, rather than the implementation's calculations or a stub's return value.

- Exercise owned collaborators together when their result matters: for example, runtime imports with the real settings repository and controlled browser storage.
- Assert saved values, rendered controls, exported data, or externally delivered messages. Avoid fixing internal delegation order or query-call counts unless the count itself protects a documented scheduling or resource limit.
- Keep explicit package, privacy, cleanup, and bounded-retry contracts. Replacing every mock or deleting every source check would lose useful protection.
- Replace or remove a redundant test when an existing behavior test already protects its contract. Keep pure transformations in the Node project and browser-dependent behavior in DOM or browser tests.

Coverage helps locate gaps; a higher number is not evidence that assertions catch faults. When strengthening a weak test, temporarily introduce a representative fault, confirm the new assertion fails, and restore the implementation. Also check an equivalent implementation change when refactoring resistance is the reason for the replacement.

For geometry, specify the player dimensions and expected pixels or storage ratios directly; importing the production converter into both sides of an assertion can hide a conversion defect. The [popup browser scenarios](../../e2e/scenarios/popup/popup.spec.ts) also verify the network blocker against an offline fallback that would succeed without it, so DNS failures cannot make the test pass. Scenario classification is checked once in [`projectClassification.spec.ts`](../../e2e/config/projectClassification.spec.ts); fixture API behavior is exercised by the browser scenarios rather than a list of prototype method names.

See [良いテストを書き、良いテストを見分ける](https://zenn.dev/nexta_/articles/unit-testing-principles-essence) and Khorikov's [When to Mock](https://enterprisecraftsmanship.com/posts/when-to-mock/) for the reasoning behind this approach.

## Vitest commands

- `yarn test:core`: `*.unit.spec.ts(x)` in Node.
- `yarn test:dom`: DOM/React/extension integration in jsdom. The project URL is `https://www.youtube.com/` so origin-sensitive route tests match production.
- `yarn test:contracts`: source, configuration, workflow, and E2E architecture contracts in Node.
- `yarn test:unit`: all three Vitest projects.
- `yarn test:coverage`: core and DOM with coverage thresholds.
- `yarn verify`: locale/store checks, Biome, TypeScript, coverage, and contract tests.
- `yarn test:package`: fresh production Chrome/Firefox packages plus manifest/output/ZIP contracts.

## Browser commands

Every testing-mode browser command builds `.output/chrome-mv3-testing` first.

- `yarn e2e` / `yarn e2e:fixture`: synthetic YouTube and popup fixtures; external network is not required.
- `yarn test:visual`: deterministic visual regression.
- `yarn test:accessibility`: deterministic axe checks.
- `yarn e2e:production:chrome`: extract and boot the exact production Chrome ZIP without a testing bridge.
- `yarn e2e:canary`: real YouTube compatibility checks.
- `yarn e2e:live` / `yarn e2e:archive`: canary narrowed by tags.
- `yarn capture:store-assets`: store asset capture through the dedicated project.

Install the Playwright browser explicitly with `yarn playwright install --with-deps chromium`.

## Where a Vitest test belongs

New specs use an explicit suffix:

| Suffix | Project | Environment |
| --- | --- | --- |
| `*.unit.spec.ts(x)` | core | Node |
| `*.dom.spec.ts(x)` | dom | jsdom |
| `*.contract.spec.ts(x)` | contracts | Node |

The DOM wildcard still enrolls legacy/plain specs under `entrypoints/` and `shared/`, but it explicitly excludes unit and contract suffixes. There is no path-maintained legacy core list. New tests must choose their boundary in the filename.

The contracts project also includes configuration/support specs under `e2e/config/`, `e2e/support/`, and `scripts/verify/`.

## Playwright classification

Every scenario under `e2e/scenarios/` is listed exactly once in `e2e/config/projectClassification.ts`.

- deterministic YouTube scenarios use `.fixture.spec.ts`;
- popup scenarios are deterministic without that suffix;
- real YouTube scenarios belong only to the canary list.

The classification contract rejects missing, duplicate, or incorrectly named scenarios. Tags describe and narrow tests but do not choose their project.

Synthetic YouTube scenarios use the typed API under `e2e/support/youtubeScenario/`. The compiler owns route URLs, fixture HTML, player identity, and chat routes. Scenario files own only state and assertions. The route model supports watch, direct-live, and channel-live entries.

## Production/testing package boundary

WXT adds the Playwright bridge only in `testing` mode. Testing projects load `.output/chrome-mv3-testing`; production smoke loads the extracted production ZIP with `YLC_REQUIRE_E2E_BRIDGE=0`.

The package contract rejects:

- the E2E bridge in production;
- source maps, spec/test files, and fixture assets;
- manifest permissions or public resources outside policy;
- mismatches between unpacked output and ZIP inventory;
- Firefox source-archive inputs that cannot be reconstructed from tracked files.

Package size budgets live in [`config/package-size-budget.json`](../../config/package-size-budget.json). Measure both production packages against those limits when updating dependencies or build output.

## Connection policy regression

When changing packaged runtime asset delivery, run the production build and then:

```bash
node scripts/verify/connection-policy.browser-test.mjs
```

This requires OpenSSL and installed Playwright Chromium. It starts a local HTTPS fixture, maps the YouTube origin to that server in a disposable profile, and verifies actual extension installation, Service Worker control, fullscreen UI, and zero extension-asset policy errors under no policy, report-only, and enforced Connection Allowlists. The temporary certificate exception is scoped to that test browser. No live YouTube content or account profile is used. Settings dialog rendering is checked for no-policy and report-only pages; enforced cross-origin iframe navigation is a separate restriction and is not claimed by this asset-delivery check. An archived pre-fix unpacked build may be supplied as the first argument with `--expect-unsafe` to demonstrate the original failure.

## Pull-request CI ownership

- `quality` runs `yarn verify`.
- `package`, after quality, builds Chrome and Firefox production ZIPs and verifies package contracts.
- `package` also builds and uploads the testing extension consumed by the next job. The production Chrome ZIP artifact is uploaded only for `workflow_dispatch`, where the packaged startup smoke consumes it.
- `browser-contracts` runs the complete fixture project and accessibility project on pull requests; manual runs add the visual project against the same testing artifact.
- `production-package-smoke` is manual and boots the exact production Chrome ZIP.

The testing build is therefore always consumed, while visual regression and exact-artifact startup remain explicit manual gates.

## Release ownership

`yarn verify:release` adds production packaging, Firefox source reconstruction, deterministic browser projects, exact Chrome ZIP startup, and strict canary execution. The release-candidate workflow produces immutable artifacts and proof; publication verifies and promotes those bytes without rebuilding.

`scripts/verify/check-release-workflow.mjs` validates the release/publish workflow shape and runs inside `yarn check`.

## Canary classification

Canary skips are reserved for YouTube-owned preconditions. Once a usable page and fullscreen state exist, missing extension UI or chat is a failure. The reporter records executed, skipped, failed, and compatibility fingerprint data for operator review.

The manually triggered [standalone canary](../../.github/workflows/canary.yml) may report environmental degradation, whereas the release path requires a clean canary. Human real-browser evidence remains part of release operation; see the [maintainer runbook](../maintainers/release-runbook.md).

## Visual baselines

Visual baselines are evaluated on the pinned Ubuntu runner with Playwright Chromium. Do not regenerate Linux baselines from macOS. Compositor-sensitive effects such as blur also use behavioral/pixel metrics rather than relying only on a screenshot match.
