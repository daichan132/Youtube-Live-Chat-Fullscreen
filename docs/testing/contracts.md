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
| Chrome/Firefox package size |  |  |  | Primary |  |

## Commands

- `yarn test:core`: pure logic and data contracts in Node.
- `yarn test:dom`: React, DOM, and extension API integration in jsdom. WXT's fake browser is reset for every test in this project only.
- `yarn test:contracts`: Node-side source/configuration contracts. It does not require pre-existing `.output` artifacts.
- `yarn test:package`: freshly builds and packages production Chrome/Firefox extensions, then verifies their manifests, locale inventory, file inventory, ZIP contents, and size budgets.
- `yarn build:e2e`: creates `.output/chrome-mv3-testing` with the storage bridge required by Playwright. Production builds never contain this bridge.
- `yarn test:unit`: compatibility gate that runs all three Vitest projects.
- `yarn e2e` / `yarn e2e:fixture`: builds the testing extension and runs only popup and synthetic YouTube fixtures. External HTTP(S) requests are blocked, retries are disabled, and this is the pull-request gate.
- `yarn e2e:canary`: builds the testing extension and runs real YouTube live, archive, no-chat, and replay-unavailable scenarios. URL discovery and environment-dependent skips remain isolated here.
- `yarn screenshots`: builds the testing extension and runs the separate screenshot project.

New tests should use `*.unit.spec.ts`, `*.dom.spec.ts(x)`, or `*.contract.spec.ts`. Existing tests remain named as-is and are classified explicitly in `vitest.config.ts` to avoid a risky bulk rename.

Playwright scenarios are explicitly listed in `e2e/config/projectClassification.ts`. Its Node/Vitest contract fails when a scenario is missing, classified twice, or placed in the deterministic project without the `.fixture.spec.ts` or popup boundary. Tags remain descriptive and may narrow a canary command, but they do not decide which project owns a test.

## Production/testing package boundary

`e2e/assets/e2e.html` is added by WXT only in `testing` mode. Playwright loads `.output/chrome-mv3-testing`; release and package scripts consume `.output/chrome-mv3` and `.output/firefox-mv2`. The package contract rejects the E2E bridge, source maps, test files, and fixture assets in both unpacked production output and ZIP files.

## Deferred boundaries

Runtime model extraction, assertion-oriented page objects, visual regression, accessibility checks, and broader CI job separation are intentionally deferred.
