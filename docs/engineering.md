# Engineering YouTube Live Chat Fullscreen

YouTube Live Chat Fullscreen is a production browser extension that cooperates with a page it does not control. YouTube changes URLs without full reloads, replaces DOM subtrees, moves chat containers in fullscreen, and exposes different chat sources for live streams and archives. The implementation contains that instability inside a session runtime with explicit ownership boundaries.

## 1. Product and runtime constraints

The extension restores chat in fullscreen without replacing YouTube's chat product. It must preserve posting, Super Chat, archive replay, and YouTube-owned authentication while avoiding UI on videos where chat is unavailable.

Live, archive, and no-chat pages are distinct runtime states. The runtime may borrow a playable YouTube iframe, create a managed iframe only for live fallback, or request no chat resource. Every decision is scoped to the current video generation so an old callback cannot mutate the next video's resources.

## 2. Lazy bootstrap and session lifecycle

The content script still matches all YouTube pages because YouTube is a single-page application. [`ContentBootstrap.ts`](../entrypoints/content/bootstrap/ContentBootstrap.ts) is the only runtime that starts on a non-watch page. It reads the URL and listens for navigation signals without creating application state, a React root, locale loading, settings watchers, DOM observers, or chat iframe discovery.

Entering `/watch` creates one [`ContentSession`](../entrypoints/content/bootstrap/createContentSession.tsx). Leaving the watch surface disposes it. An activation token disposes a session that finishes initializing after the route has already changed. [`SessionScope.ts`](../entrypoints/content/bootstrap/SessionScope.ts) owns the abort signal, timers, animation frames, listeners, and cleanup callbacks used inside each active chat generation.

## 3. YouTube compatibility adapter and pure model

[`collectPageObservation.ts`](../entrypoints/content/platform/youtube/collectPageObservation.ts) is the compatibility boundary between unstable YouTube DOM and application logic. Selectors live in [`selectorCatalog.ts`](../entrypoints/content/platform/youtube/selectorCatalog.ts). The adapter returns serializable evidence separately from DOM targets, allowing the same evidence to be fingerprinted and tested without retaining page nodes.

[`resolveChatDecision.ts`](../entrypoints/content/runtime/resolveChatDecision.ts) converts evidence and targets into a chat decision. [`runtimeModel.ts`](../entrypoints/content/runtime/runtimeModel.ts) turns observations and events into a semantic `RuntimePlan`; it does not emit DOM operations. [`ChatRuntime.ts`](../entrypoints/content/runtime/ChatRuntime.ts) owns the current generation and schedules reconciliation, while [`ResourceReconciler.ts`](../entrypoints/content/runtime/ResourceReconciler.ts) applies the plan.

## 4. Resource ownership and restoration

Four leases own all reversible page mutations:

- [`ChatIframeLease.ts`](../entrypoints/content/runtime/resources/ChatIframeLease.ts) borrows or creates one chat iframe and restores or removes it idempotently.
- [`PresentationLease.ts`](../entrypoints/content/runtime/resources/PresentationLease.ts) owns the overlay shadow root and player switch container.
- [`PlayerLayoutLease.ts`](../entrypoints/content/runtime/resources/PlayerLayoutLease.ts) owns fullscreen player layout changes and their restoration.
- [`ChatChromeLease.ts`](../entrypoints/content/runtime/resources/ChatChromeLease.ts) owns chat-only presentation changes inside the iframe document.

Live streams prefer a playable native `live_chat` iframe and create a managed `live_chat?v=<videoId>` iframe only as fallback. Archives borrow only a playable native `live_chat_replay` iframe. Restoration happens before layout and presentation release, and every release operation is safe to repeat.

## 5. Settings, Geometry V2, and adaptive placement

[`repository.ts`](../shared/settings/repository.ts) remains the storage boundary shared by popup, content, and settings contexts. Stored values retain versioned envelopes and writer identifiers. [`migrateSettings.ts`](../shared/settings/migrateSettings.ts) and [`normalizeSettings.ts`](../shared/settings/normalizeSettings.ts) accept older pixel geometry without discarding it.

The overlay now stores player-relative `ChatGeometryV2` ratios. Old pixel values stay pending until the player's first usable rectangle is available, then migrate once with `pinned: true`. Rendering responds to player resize and clamps the chat to a 240 by 180 pixel minimum and 65% by 90% player-relative maximum.

[`autoSafeArea.ts`](../entrypoints/content/overlay/autoSafeArea.ts) compares the current position with four corner candidates. It minimizes overlap with captions, controls, menus, the end screen, and settings; then minimizes movement and maximizes visible chat area. Small improvements do not move the overlay, drag and resize pause evaluation, manual movement pins the geometry, and an unpinned session repositions at most once.

The full settings application is a separate [`settings.html`](../entrypoints/settings/index.html) entrypoint displayed through an extension iframe. This keeps settings state synchronized through the existing repository while reducing the UI directly owned by the content React tree.

## 6. Diagnostics and compatibility canaries

[`RuntimeTrace.ts`](../entrypoints/content/diagnostics/RuntimeTrace.ts) stores a bounded in-memory event history. Events use stable failure codes and generation numbers. [`sanitizeDiagnosticReport.ts`](../entrypoints/content/diagnostics/sanitizeDiagnosticReport.ts) exports only the shared diagnostic schema; raw URLs, video IDs, chat text, user names, and user-specific data are excluded.

The settings panel can copy the sanitized report or restart the current chat runtime. Canary tests emit a compatibility fingerprint from the same evidence model and classify the result as passed, degraded, or failed without adding mutable operational state to production source code.

## 7. Deterministic and live browser tests

Pull-request tests do not depend on YouTube's current production data. The deterministic Playwright project serves typed YouTube scenarios, blocks external requests, and proves live, archive, no-chat, replay-unavailable, SPA navigation, player replacement, iframe restoration, popup, visual, and accessibility behavior.

Real YouTube checks run separately as canaries. They detect compatibility drift but do not replace deterministic contracts because live streams and archive replay can disappear independently of a code change. The complete boundary matrix and commands are documented in [`docs/testing/contracts.md`](testing/contracts.md).

Architecture checks reject module-global runtime ownership, direct runtime timers, selector duplication outside the adapter, low-level DOM actions in the pure model, and sensitive fields in diagnostic exports.

## 8. Chrome and Firefox release safety

One WXT codebase produces Chrome and Firefox packages. CI builds both browsers from a clean checkout, verifies package contents and size budgets, and builds a separate testing extension for browser contracts.

The release-candidate workflow repeats source checks, tests, production builds, package verification, fixture E2E, visual checks, and accessibility checks. It then extracts the exact Chrome production ZIP, boots it without the testing bridge, and runs the real-YouTube canary with degraded, flaky, and skipped outcomes treated as failures. Passing ZIPs receive a commit-bound SHA-256 proof and are attached to a draft release.

Publication is a separate manual promotion workflow with protected Chrome and Firefox environments. It downloads and verifies the draft assets, submits those exact bytes to the stores, and never rebuilds after proof. Testing-only assets are injected only in WXT's `testing` mode; package contracts reject them from release ZIP files. See [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), [`.github/workflows/cd.yml`](../.github/workflows/cd.yml), [`.github/workflows/publish.yml`](../.github/workflows/publish.yml), and [`scripts/verify/check-package-contracts.mjs`](../scripts/verify/check-package-contracts.mjs).

## 9. Internationalization

The English source locale defines the translation shape. [`scripts/generate-locales.mjs`](../scripts/generate-locales.mjs) compiles 55 source locale files into runtime JSON, browser manifest messages, locale metadata, and TypeScript translation keys. Generated outputs are checked in CI so missing keys and stale artifacts fail before release.

Direction is part of locale metadata. Arabic, Hebrew, and Farsi render the popup and settings with RTL direction rather than relying on browser heuristics alone.

## 10. Privacy and permissions

The manifest requests only `activeTab` and `storage`. The extension does not require an account, add analytics, or collect personal data. Its page access, settings model, diagnostic schema, package contents, and release workflow can all be reviewed from this repository.
