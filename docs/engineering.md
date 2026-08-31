# Engineering YouTube Live Chat Fullscreen

YouTube Live Chat Fullscreen is a production browser extension that cooperates with a page it does not control. YouTube changes routes without full reloads, replaces DOM subtrees, moves chat containers in fullscreen, and exposes different chat sources for live streams and archives. The code contains that instability behind explicit runtime, storage, and trust boundaries.

## Start here

The extension has three WXT entrypoints and no background service worker:

1. `entrypoints/content/index.tsx` gates work by YouTube route and owns the content-session lifecycle.
2. `entrypoints/popup/main.tsx` mounts the toolbar popup.
3. `entrypoints/settings/main.tsx` mounts `settings.html`, displayed inside an extension iframe over the player.

The content runtime is easiest to understand in this order:

1. `ContentBootstrap.ts` — supported video-surface gate (`/watch`, direct `/live/<videoId>`, and channel `/live` entries) plus bounded session-start retry.
2. `createContentSession.tsx` and `SessionScope.ts` — construct one context-owned React/runtime session and own cleanup.
3. `platform/youtube/` — collect evidence and DOM targets from the moving page.
4. `resolveChatDecision.ts` and `runtimeModel.ts` — pure decisions and plans.
5. `ChatRuntime.ts` and `ResourceReconciler.ts` — coalesce events and apply the plan.
6. `runtime/resources/` — leases that own and reverse YouTube DOM changes.

Settings are independent of the YouTube runtime and are documented in [Settings, state, and storage](architecture/settings-and-state.md).

## Runtime model

One reconcile pass follows this sequence:

```text
page signal
  → one animation-frame reconciliation
  → collect observation (serializable evidence + live DOM targets)
  → detect session identity/generation changes
  → resolve chat decision
  → transition the pure runtime model
  → reconcile reversible resource leases
  → publish a small view for React portals
```

A generation identifies the current combination of video, player element, and fullscreen root. Timers and callbacks capture the relevant generation and no-op after it changes. A borrowed YouTube iframe is released before another is acquired.

Live streams prefer YouTube's native `live_chat` iframe and may create a managed live iframe when none exists. Archives borrow only a playable native `live_chat_replay` iframe. Videos without usable chat do not receive a broken switch or overlay.

## Resource ownership

Four lease types own page mutations:

- `ChatIframeLease` borrows or creates one chat iframe and restores/removes it idempotently.
- `PresentationLease` owns the overlay Shadow Root and player-control switch host.
- `PlayerLayoutLease` owns fullscreen player-layout adjustments.
- `ChatChromeLease` owns chat-document presentation changes.

Lease release restores YouTube-owned state rather than deleting it. SPA navigation, player replacement, fullscreen exit, runtime restart, and extension invalidation all terminate through the same ownership model.

## Recovery boundaries

Recovery is deliberately finite.

- Content-session creation retries after 250 ms and 1 second, then stops.
- Route changes and WXT context invalidation cancel pending activation and dispose stale sessions.
- Expected pending chat states use the runtime model's bounded retry policy.
- An unexpected reconciliation exception records `UNEXPECTED_RUNTIME_ERROR`, clears owned resources, resets the session model, and permits one recovery attempt. A repeated exception does not start an unbounded loop.
- Popup and settings initialization failures render a small reload fallback instead of a blank page.

Failure codes and a bounded in-memory trace are exported through a sanitized diagnostic report. URLs, video IDs, chat text, user names, and user-specific content are excluded.

## Settings guarantees

Storage uses five ownership domains: enabled, theme, appearance, geometry, and locale. Startup is a fail-closed, read-through compatibility lookup. Global/chat compatibility values are not migrated or deleted at startup; a legacy extension-page locale may be copied non-destructively so all contexts converge.

Interactive writes are serialized per domain, retried once, and expose a shared persistence notice after an unresolved error. Same-domain concurrent edits use last-write-wins. Backup import is one bulk Storage operation, while ordinary edits remain isolated by domain.

See [Settings, state, and storage](architecture/settings-and-state.md) for the exact conflict and failure model.

## Settings iframe trust boundary

The settings iframe uses `window.postMessage` only for close, diagnostic request/report, and runtime restart. Settings values never cross this channel.

Both directions require:

- the expected `Window` object;
- the exact allowed origin;
- a recognized payload schema.

The YouTube parent origin is passed explicitly in the settings URL and accepted only when it equals `https://www.youtube.com`. Wildcard target origins are not used.

## WXT-owned and project-owned code

WXT owns standard extension plumbing:

- manifest/browser targeting;
- `wxt:locationchange`;
- `ContentScriptContext` invalidation and cleanup;
- Shadow Root UI mounting;
- Storage primitives;
- Chrome/Firefox build and ZIP creation;
- Vitest integration and Firefox submission.

Project code remains only where the product needs explicit behavior:

- YouTube completion signals and selectors;
- live/archive/no-chat source rules;
- session generations and reversible leases;
- settings conflict behavior;
- Chrome Web Store v2 polling that the generic publisher does not yet provide.

## Local verification

Routine quality checks are local-first:

```bash
yarn verify
```

This checks locale/store artifacts, Biome, TypeScript, coverage, and contracts.

Release preparation is explicit:

```bash
yarn verify:release
```

It adds Chrome and Firefox production packages, package contracts, Firefox source-archive reconstruction, deterministic browser scenarios, visual and accessibility checks, an exact Chrome-package startup smoke, and the real-YouTube canary.

The pull-request CI runs source checks, tests, production package contracts, and the deterministic Playwright fixture project. Visual and accessibility checks plus exact production-package startup smoke remain `workflow_dispatch`-only. Release candidate creation and store publication are separate manual workflows; publication submits the already-proven artifacts without rebuilding them.

## Guarantees

The repository's contracts and focused tests are intended to demonstrate these properties:

- the production manifest requests only `storage` and exposes only the declared YouTube-scoped resources;
- unsupported YouTube pages do not create the application runtime;
- supported `/watch`, direct `/live/<videoId>`, and channel `/live` entries converge on one content-session lifecycle;
- session-owned timers, listeners, observers, portals, iframe changes, and layout changes are disposed;
- a stale session cannot mutate a later video generation;
- Storage outages do not trigger fallback writes;
- unrelated settings owners do not overwrite one another;
- iframe messages cannot be accepted from another source or origin;
- testing bridges, source maps, tests, and fixtures are absent from production ZIPs;
- release publication promotes the exact candidate bytes.

## Intentional non-goals

The project does not attempt to provide:

- a generic browser-extension framework on top of WXT;
- a background worker for state coordination;
- distributed conflict-free merging inside one settings domain;
- unlimited retry or remote monitoring;
- prediction of every future YouTube DOM change;
- automatic CI on every commit;
- exhaustive Firefox duplication of every Chromium scenario.

When a new abstraction does not remove more product-specific complexity than it introduces, keep the direct implementation.

## Further reading

- [Content runtime](architecture/content-runtime.md)
- [Settings, state, and storage](architecture/settings-and-state.md)
- [Overlay and iframe styling](architecture/overlay-and-styling.md)
- [Internationalization](architecture/i18n.md)
- [Testing contracts](testing/contracts.md)
- [Troubleshooting](troubleshooting.md)
