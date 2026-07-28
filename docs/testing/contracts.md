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
- `yarn test:contracts`: Node-side package/configuration contracts. It reads source policy and does not require pre-existing `.output` artifacts.
- `yarn test:unit`: compatibility gate that runs all three Vitest projects.
- `yarn e2e`: existing browser tests. Deterministic fixture and real-YouTube scenarios remain in the existing Playwright project during this first migration slice.

New tests should use `*.unit.spec.ts`, `*.dom.spec.ts(x)`, or `*.contract.spec.ts`. Existing tests remain named as-is and are classified explicitly in `vitest.config.ts` to avoid a risky bulk rename.

## Deferred boundaries

The next slices should split deterministic fixture E2E from real-YouTube canaries, introduce a testing-only WXT build so `e2e.html` is absent from production packages, and validate freshly built Chrome/Firefox archives. Runtime model extraction, assertion-oriented page objects, visual regression, accessibility checks, and CI job separation are also intentionally deferred.
