# Settings, state, and storage

*Part of the architecture set: [overview](../engineering.md) · [content runtime](./content-runtime.md) · [overlay and styling](./overlay-and-styling.md) · [internationalization](./i18n.md).*

The popup, content script, and settings page each own a separate Jotai store and a separate `SettingsRepository`. They converge through `browser.storage.local`; there is no background service worker and settings do not travel through `runtime` or `tabs` messages.

## Stored domains

Settings are split by write ownership rather than by screen or by one broad snapshot.

| Key | Value | Primary writers |
| --- | --- | --- |
| `ylc-enabled` | Whether fullscreen chat is enabled | popup and content switch |
| `ylc-theme` | `light`, `dark`, or `system` | popup |
| `ylc-chat-appearance` | chat profile and custom/builtin preset list | settings page |
| `ylc-chat-geometry` | player-relative or legacy pixel geometry | content script |
| `ylc-locale` | selected runtime locale | popup/settings |

Each value uses the same small envelope:

```ts
type StoredEnvelope<T> = {
  schemaVersion: 1
  writerId: string
  value: T
}
```

Splitting enabled from theme and appearance from geometry prevents one context from carrying unrelated stale fields into a write. Same-domain concurrent edits intentionally use last-write-wins; this project does not add a background coordinator, compare-and-swap protocol, revision database, or field-level merge.

## Startup compatibility

`repository.load()` performs a fail-closed, read-through compatibility lookup:

1. Read the five current ownership-domain keys.
2. Fill missing domains from the previous `ylc-global-settings`, `ylc-chat-settings`, and `ylc-locale` envelopes.
3. Fill anything still missing from legacy Zustand/localStorage values.
4. Use defaults only when no stored value exists.

A failed Storage API call aborts initialization. It is never interpreted as a missing key, so an outage cannot authorize fallback writes or deletion.

Global and chat compatibility data are never rewritten or removed during startup. Locale has one narrow exception: an extension page that can still see legacy `localStorage.i18nextLng` may non-destructively copy that value into `ylc-locale`. The old value remains in place. This lets the content script, which cannot read extension-page localStorage, converge on the same locale without a destructive migration protocol.

## Writes and convergence

Each domain has an independent serialized queue. A write is attempted once, waits 400 ms after failure, and is attempted one more time. A still-failing latest write remains visible in `PersistenceStatus`, makes `flush()` reject, and can be retried explicitly.

The queue follows four rules:

- a newer local write invalidates an older failed retry for the same domain;
- a valid external Storage event invalidates an older failed retry for that domain;
- external committed events are applied immediately, while a successful local write reads back the final stored value before converging the local Jotai store;
- `flush()` rechecks the domain tails until no new write was queued while it was waiting.

`writerId` identifies the writer of a committed value. Own Storage events are ignored because the post-write readback handles local convergence without allowing an older queued event to replace a newer in-memory intent. `createAppRuntime` wraps repository-driven atom updates in `applyExternal`, so applying a committed value does not echo it back into Storage.

## Import and backup

The backup schema remains version 2 and contains enabled/theme plus chat appearance, presets, and geometry. Locale is intentionally browser-local and is not exported.

Imports are rejected before parsing when the file exceeds 1 MiB. A valid backup may contain at most 100 custom presets. Import first flushes pending interactive writes, then writes enabled, theme, appearance, and geometry in one `storage.setItems` operation. Only after that operation succeeds does the runtime replace its in-memory state. Normal interactive edits continue to use independent domain writes.

## Failure behavior

| Failure | Result |
| --- | --- |
| Storage read fails | runtime initialization fails; popup/settings show a reload fallback |
| Interactive write fails once | one delayed retry |
| Interactive write fails twice | persistence notice remains visible and Retry is offered |
| A newer external value arrives | stale failed retry is invalidated and the committed value is applied |
| Import bulk write fails | current in-memory state stays unchanged and the import error is shown |
| Locale write fails | the selected locale remains visible locally; persistence notice exposes the unsaved state |

## Editor state

Undo history, redo history, active gestures, and draft profile values remain in memory only. Preview changes do not write Storage. A committed appearance change writes one appearance envelope; geometry commits write only the geometry envelope. An external appearance change clears a conflicting draft/history, while an external geometry-only change does not discard appearance undo history.

## Guarantees and non-goals

Focused tests cover:

- read failures never produce writes;
- startup compatibility reads do not destructively migrate global/chat data;
- appearance and geometry can be written concurrently without overwriting each other;
- stale retries cannot replace newer external values;
- `flush()` waits for writes queued while it is pending;
- import uses one bulk Storage operation;
- external events and post-write readback converge each context on the committed value.

Intentionally not provided:

- field-level merging inside one domain;
- cross-device synchronization;
- unlimited automatic retry;
- a persistent background worker solely for settings coordination;
- automatic deletion of old compatibility keys.
