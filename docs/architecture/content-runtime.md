# The content runtime

*Part of the architecture set: [overview](../engineering.md) · [Settings, state, and storage](./settings-and-state.md) · [The overlay and iframe styling](./overlay-and-styling.md) · [Internationalization](./i18n.md) — see the [documentation index](../README.md).*

The content script is injected into every `www.youtube.com` page but creates the application runtime only on a supported video surface. Supported entry URLs are `/watch`, direct `/live/<videoId>`, and channel live entries such as `/@name/live`, `/channel/<id>/live`, `/c/<name>/live`, and `/user/<name>/live`. One content session owns one React tree and one `ChatRuntimeImpl`; leaving those surfaces disposes the complete session.

## What this owns

This subsystem owns:

- lazy route gating and content-session creation in `bootstrap/`;
- YouTube URL, player, selector, and chat-source compatibility in `platform/youtube/` and the focused helpers under `utils/`;
- pure decisions and plans in `resolveChatDecision.ts` and `runtimeModel.ts`;
- the DOM/timer driver in `ChatRuntime.ts`;
- reversible page mutations in the four leases under `runtime/resources/`;
- bounded in-memory diagnostics under `diagnostics/`.

Overlay geometry and pointer interaction run separately in `overlay/`. Settings storage is also independent: the runtime receives only an effective `ChatProfile` from React. There is no background service worker coordinating this state.

## Route and bootstrap lifecycle

`getYouTubeContentSurface(href)` is the route authority. It rejects non-YouTube origins and returns a stable activation key for:

| URL shape | Route | Initial video identity |
| --- | --- | --- |
| `/watch?v=<id>` | `watch` | query parameter, or pending when absent |
| `/live/<id>` | `live` | path segment |
| `/@name/live`, `/channel/<id>/live`, `/c/<name>/live`, `/user/<name>/live` | `live` | initially unknown |

A channel live entry is valid before YouTube has resolved the current stream. `getCurrentYouTubeVideoId()` then collects candidates from the player API, watch surface attributes, and native chat iframe URLs. It accepts the identity only when exactly one candidate remains, preventing a stale SPA subtree from selecting the wrong video.

`entrypoints/content/index.tsx` owns the bootstrap and forwards two signals:

- WXT `wxt:locationchange`, including its completed destination URL;
- YouTube `yt-navigate-finish`, which may retry a previously exhausted channel-live activation after the page has populated its player.

`ContentBootstrap` creates no session on unsupported pages. Session construction is normalized through a promise so synchronous and asynchronous failures enter the same bounded retry sequence: initial attempt, 250 ms, then 1 second. After exhaustion it reports only a sanitized route-level failure and remains stopped until the surface changes or a completed navigation explicitly retries it.

An activation token prevents a session that finishes after navigation from being installed. A stale constructed session is disposed immediately.

## One reconcile pass

```text
page signal
  → one animation-frame reconciliation
  → collect observation (serializable evidence + live DOM targets)
  → establish or replace the generation scope
  → resolve a chat decision
  → transition the pure runtime model into a semantic plan
  → reconcile reversible resource leases
  → publish the small React view
```

`PageObservation` is split into two parts:

- `evidence`: serializable route, video, fullscreen, mode, availability, capabilities, source kind, and probe IDs;
- `targets`: live DOM references required by leases.

DOM nodes never enter diagnostic reports or pure model transitions.

## Selectors and page observation

YouTube selectors used for runtime compatibility live in `platform/youtube/selectorCatalog.ts` as named probes. A probe has a stable diagnostic ID and an ordered fallback list. `queryFirstProbe` reports the first matched fallback; `queryAllProbes` deduplicates nodes found by multiple candidates.

The catalog also defines observer boundaries. Active-state selectors and observer selectors are intentionally different when a class can be removed:

- live detection uses `.ytp-time-display.ytp-live` and `.ytp-live-badge.ytp-live-badge-is-livehead`;
- mutation wake-up uses stable `.ytp-time-display` and `.ytp-live-badge` boundaries, so removing the active class still triggers reconciliation.

The runtime MutationObserver watches only attributes and subtrees capable of changing route, player, chat, or live/archive classification. Unrelated animation and text mutations are ignored.

Auto-placement has its own player-scoped observer. It runs only while geometry is unpinned and reacts to changes at or inside caption, controls, menu, and end-screen obstacles, including `characterData` changes inside captions. It is not part of `ChatRuntime` reconciliation.

## Generation and scheduling

`ChatRuntimeImpl` has two scopes:

- `contentScope` is generation `0` and owns page-level listeners plus the coalescing animation frame;
- `sessionScope` is generation `N` and owns the runtime observer, retry timer, and iframe-load callbacks for one `{ videoId, player, fullscreenRoot }` identity.

Changing any identity component first applies the stop plan to current resources, disposes the old scope, and creates the next generation. Deferred callbacks compare their captured scope or generation against the current one and no-op after replacement.

Signals are coalesced into one animation frame. Retry work uses `SessionScope`; there is no interval and no unbounded retry loop.

## Decision and model

`resolveChatDecision` produces one of four semantic outcomes:

- `inactive`: unsupported surface, not fullscreen, or disabled;
- `pending`: the current page may expose chat but required evidence is incomplete;
- `available`: a live or archive source is usable;
- `unavailable`: the current video has no usable chat.

Live streams prefer a native `live_chat` iframe and may fall back to a managed `https://www.youtube.com/live_chat?v=<id>` iframe. Archives use only a native playable `live_chat_replay` iframe because no equivalent standalone replay URL exists.

`transitionRuntimeModel` converts the decision, enabled state, and current lease snapshot into a `RuntimePlan`. Plans express intent (`monitoring`, `presentation`, `chat`, `layout`, `retry`, and optional archive-panel opening), not DOM commands. Every resource field supports `preserve`, which means “do not touch this owner this tick.”

The five runtime statuses are `inactive`, `searching`, `active`, `recovering`, and `unavailable`. Loading is true only while searching or recovering.

## Resource ownership

Four lease types own page mutations:

- `ChatIframeLease` borrows or creates one iframe and restores or removes it idempotently;
- `PresentationLease` owns the overlay Shadow Root and player-control switch host;
- `PlayerLayoutLease` owns fullscreen layout adjustments;
- `ChatChromeLease` owns presentation changes inside the chat document.

Resource reconciliation uses a fixed order. An incompatible iframe is released before another is acquired. On teardown, the chat iframe is restored before layout and presentation are removed.

Borrowed iframe restoration tries, in order:

1. its captured placeholder;
2. its original parent and next sibling;
3. a current matching native chat host.

If YouTube replaced every target, restoration remains owned by the reconciler and is retried on later observations. A lease is discarded rather than attached to a different video.

## Recovery and diagnostics

Expected pending chat states use the model backoff:

```text
250 ms → 500 ms → 1 s → 2 s → 5 s (capped repetitions)
```

The sequence has a finite attempt cap. Exhaustion releases runtime resources and moves the view to `unavailable`.

An unexpected reconcile exception records `UNEXPECTED_RUNTIME_ERROR`, clears owned resources best-effort, resets the model and generation scope, and permits one recovery attempt. A second exception stops instead of looping.

Diagnostic reports contain the extension version, browser family, sanitized evidence, current state, lease summary, failure code, and a bounded trace. They exclude URLs, video IDs, chat text, user names, and other user-specific content.

## Teardown paths

- **Fullscreen exit or extension switch off:** release the iframe, layout, and presentation through the runtime plan. The content session remains available for a later toggle.
- **Video, player, or fullscreen-root replacement:** stop the current generation, dispose its scope, and continue reconciliation in a fresh generation.
- **Leaving every supported content surface:** `ContentBootstrap` invalidates activation and disposes the React/runtime session.
- **Extension invalidation or React unmount:** WXT cleanup removes the shadow UI and calls runtime disposal through the same ownership paths.

## Invariants and their tests

- At most one `ContentSession` exists, and only on a supported YouTube content surface. `ContentBootstrap.spec.ts` and `youtubeSurface.unit.spec.ts` pin the route matrix and stale-activation disposal.
- Runtime timers, frames, observers, and listeners are scoped and disposed. `SessionScope.spec.ts`, `ChatRuntime.spec.ts`, and `ChatRuntimeRecovery.spec.ts` pin cleanup and bounded recovery.
- The old iframe is released before a new video or source is acquired. `ResourceReconciler.spec.ts` and `ChatRuntime.spec.ts` assert invocation order and identity replacement.
- Borrowed YouTube DOM is restored rather than deleted. `iframeAttachment.spec.ts` and the deterministic borrow/restore fixture pin exact slot restoration.
- Evidence is serializable and diagnostics omit video identity. Observation and sanitizer specs pin both boundaries.
- YouTube selector fallbacks have unique IDs and non-empty candidates. `selectorCatalog.spec.ts` also pins stable live-state mutation boundaries.
- Channel live entries are exercised by both URL/unit contracts and a deterministic browser fixture that reaches fullscreen chat.

These guarantees are tests and ownership structure, not a string-matching architecture script. `yarn verify` is the routine source gate; `yarn verify:release` adds production packages and browser layers.

## Where to change things

| Change | Primary location | Required companion work |
| --- | --- | --- |
| Support another YouTube entry URL | `youtubeSurface.ts` | bootstrap/unit tests and a deterministic fixture when behavior differs |
| Change a YouTube selector | the relevant probe in `selectorCatalog.ts` | observer boundary when the mutation must wake runtime; probe tests |
| Change player video identity | `playerVideoData.ts` / `getYouTubeVideoId.ts` | stale-SPA and channel-live tests |
| Add a chat source | `resolveChatDecision.ts` and runtime source types | lease creation/matching and release-before-acquire tests |
| Change a state’s overlay/switch behavior | `runtimeModel.ts` | `runtimeModel.unit.spec.ts` and portal/runtime tests |
| Add a page mutation | a scoped lease and `RuntimePlan` field | idempotent reverse operation and teardown-order tests |
| Change retry timing | bootstrap or runtime retry constants | fake-timer tests with explicitly controlled clock advancement |
| Add diagnostic data | sanitizer/report types | privacy tests; never add URL, video ID, or chat content |
| Add a Vitest spec | `*.unit.spec.ts`, `*.dom.spec.ts(x)`, or `*.contract.spec.ts` | choose the environment intentionally |
| Add a Playwright scenario | `e2e/scenarios/` | register it exactly once in `projectClassification.ts` |

## Gotchas

- The first available reconcile can occur before React supplies the overlay carrier. Initialization may therefore enter `recovering`; `ChatViewport` closes the loop by calling `setOverlayContainer`.
- `initializeIframe` also requires a profile and a usable non-`about:blank` chat document. Failure is intentionally represented by `IFRAME_DOCUMENT_NOT_READY`.
- Observation stamps internal `data-ylc-observed-*` markers on chat nodes. Those attributes must stay outside the runtime observer filter to avoid self-triggered loops.
- `presentation: 'switch-only'` keeps only the switch presentation enabled; it must not retain an overlay root or iframe lease.
- Wall-clock archive-panel cooldown is separate from scope timers.
- A new selector should not be copied into helpers. Add or extend a catalog probe and reuse its query helpers.
