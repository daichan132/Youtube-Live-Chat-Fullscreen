# Engineering YouTube Live Chat Fullscreen

YouTube Live Chat Fullscreen is a production browser extension that has to cooperate with a page it does not control. YouTube changes URLs without full reloads, replaces DOM subtrees, moves chat containers in fullscreen, and exposes different chat sources for live streams and archives. The engineering design keeps those unstable browser details behind small, testable boundaries.

## 1. Product constraints

The extension restores chat in fullscreen without replacing YouTube's chat product. It must preserve posting, Super Chat, archive replay, and YouTube-owned authentication while avoiding UI on videos where chat is unavailable.

The runtime therefore treats live, archive, and no-chat pages as separate states. [`resolveChatDecision.ts`](../entrypoints/content/runtime/resolveChatDecision.ts) converts a page observation into a pure decision, while [`runtimeModel.ts`](../entrypoints/content/runtime/runtimeModel.ts) owns state transitions. DOM ownership and side effects stay in [`ChatRuntime.ts`](../entrypoints/content/runtime/ChatRuntime.ts).

## 2. YouTube SPA and DOM lifecycle

YouTube navigation does not guarantee a document reload. `ChatRuntime` listens for `yt-navigate-finish`, fullscreen changes, iframe loads, and relevant DOM mutations. Reconciliation is scheduled through `requestAnimationFrame` so multiple page mutations collapse into one observation.

The runtime observes only chat-related boundaries instead of reacting to every YouTube mutation. [`readPageSnapshot.ts`](../entrypoints/content/runtime/readPageSnapshot.ts) records the current page state; the pure resolver and model decide what should happen next. This separation makes DOM replacement reproducible in unit and fixture tests.

## 3. Live chat and archive replay resolution

Live streams prefer YouTube's native `live_chat` iframe when one is available. A managed `live_chat?v=<videoId>` iframe is the fallback. Archives borrow only a playable native `live_chat_replay` iframe, because a newly constructed live URL cannot reproduce archive replay.

[`iframeLease.ts`](../entrypoints/content/runtime/iframeLease.ts) represents temporary ownership of either a borrowed or managed iframe. Releasing a borrowed lease restores the YouTube-owned iframe instead of destroying it. The live, archive, pending, and unavailable rules are covered in [`resolveChatDecision.spec.ts`](../entrypoints/content/runtime/resolveChatDecision.spec.ts), [`iframeLease.spec.ts`](../entrypoints/content/runtime/iframeLease.spec.ts), and deterministic browser scenarios under [`e2e/scenarios`](../e2e/scenarios).

## 4. Settings ownership and migration

[`repository.ts`](../shared/settings/repository.ts) is the storage boundary shared by the popup and content script. Stored values use versioned envelopes and writer identifiers so updates can synchronize without treating a context's own write as a remote change.

Every load passes through normalization and migration before entering application state. [`migrateSettings.ts`](../shared/settings/migrateSettings.ts) upgrades legacy schemas, while [`normalizeSettings.ts`](../shared/settings/normalizeSettings.ts) constrains imported or stored values. Backup import and export use the same typed settings model rather than mutating raw storage from React.

## 5. Deterministic tests and live canary tests

Pull-request tests must not depend on YouTube's current production data. The deterministic Playwright project serves typed YouTube scenarios, blocks external requests, and proves representative live, archive, navigation, popup, visual, and accessibility behavior.

Real YouTube checks run separately as canaries. They detect compatibility drift but do not replace deterministic contracts, because live streams and archive replay can disappear independently of a code change. The complete boundary matrix and commands are documented in [`docs/testing/contracts.md`](testing/contracts.md).

## 6. Chrome and Firefox release safety

One WXT codebase produces Chrome and Firefox packages. CI builds both browsers from a clean checkout, verifies package contents and size budgets, and builds a separate testing extension for browser contracts.

The release workflow repeats source checks, tests, production builds, package verification, fixture E2E, visual checks, and accessibility checks before publication. Testing-only assets are injected only in WXT's `testing` mode; package contracts reject them from release ZIP files. See [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), [`.github/workflows/cd.yml`](../.github/workflows/cd.yml), and [`scripts/verify/check-package-contracts.mjs`](../scripts/verify/check-package-contracts.mjs).

## 7. Internationalization

The English source locale defines the translation shape. [`scripts/generate-locales.mjs`](../scripts/generate-locales.mjs) compiles 55 source locale files into runtime JSON, browser manifest messages, locale metadata, and TypeScript translation keys. The generated outputs are checked in CI so missing keys and stale artifacts fail before release.

Direction is part of locale metadata. Arabic, Hebrew, and Farsi render the popup and settings with RTL direction rather than relying on browser heuristics alone.

## 8. Privacy and permissions

The manifest requests only `activeTab` and `storage`. `activeTab` scopes browser interaction to the active page, while `storage` keeps settings in extension-managed browser storage.

The extension does not require an account, add analytics, or collect personal data. Its page access, settings model, package contents, and release workflow can all be reviewed from this repository.
