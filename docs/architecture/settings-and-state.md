# Settings, state, and storage

*Part of the architecture set: [overview](../engineering.md) · [content runtime](./content-runtime.md) · [overlay and styling](./overlay-and-styling.md) · [internationalization](./i18n.md).*

The popup, content script, and settings page each own a separate Jotai store and `SettingsRepository`. They converge through `browser.storage.local`; there is no background service worker and settings do not travel through runtime or tabs messages.

## Ownership in the code

| Responsibility | Module |
| --- | --- |
| Settings types and defaults | `shared/settings/model.ts`, `defaults.ts` |
| Domain/value mapping, Storage items and envelope validation | `shared/settings/storageDomains.ts` |
| Startup and read-only compatibility decoding | `shared/settings/readSettingsSnapshot.ts` |
| Serialized writes, bounded retry, notifications and bulk import | `shared/settings/repository.ts` |
| Backup input validation and normalized output types | `shared/settings/backup.ts` |
| Connecting persistence to context-owned state | `shared/runtime/createAppRuntime.ts` |
| Committed settings, editing drafts and history | `shared/state/atoms.ts`, `commands.ts` |

Compatibility decoding does not belong in the interactive write queue. The repository keeps its queue implementation direct; this is not a generic persistence framework.

## Stored domains

Settings are split by write ownership rather than by screen or one broad snapshot.

| Key | Value | Primary writers |
| --- | --- | --- |
| `ylc-enabled` | Whether fullscreen chat is enabled | popup and content switch |
| `ylc-theme` | `light`, `dark`, or `system` | popup |
| `ylc-chat-appearance` | chat profile and custom/builtin preset list | settings page |
| `ylc-chat-geometry` | player-relative or legacy pixel geometry | content script |
| `ylc-locale` | selected runtime locale | popup/settings |

Each value uses `StoredEnvelope<T>`: `{ schemaVersion: 1, writerId: string, value: T }`. Envelope validation establishes only the envelope, not the domain value; domain-specific normalization remains necessary.

Separate domains prevent an unrelated stale field from riding along with an edit. Same-domain concurrent edits intentionally use last-write-wins. There is no field-level merge, compare-and-swap protocol, revision database or background coordinator.

## Startup compatibility

`repository.load()` delegates to a fail-closed, read-through compatibility lookup. Current domain keys take precedence over the previous global/chat envelopes, which take precedence over legacy Zustand and locale values. Defaults fill missing values.

A failed Storage API call aborts initialization. It is never interpreted as a missing key and cannot authorize fallback writes or deletion. Global/chat compatibility inputs are not rewritten or removed during startup.

Locale has one narrow exception: an extension page that can still read a legacy locale may copy that selection non-destructively into `ylc-locale`. The old value remains. This allows content scripts, which cannot access extension-page localStorage, to converge on the same language.

## Writes and convergence

Each domain has an independent serialized queue. A write is attempted once, waits 400 ms after failure, and is attempted once more. An unresolved latest failure remains visible in `PersistenceStatus`, makes `flush()` reject, and can be retried explicitly.

A newer local write or valid external committed event invalidates an obsolete failed retry for that domain. A local commit reads Storage back to converge on the final value, while its own Storage events are ignored. A local write can finish after an external commit, so the readback generation is captured after the write. Any new local intent or external event received while that readback is pending prevents the captured result from being applied.

`flush()` rechecks the domain tails until no new write was queued while it was waiting. `createAppRuntime` applies repository notifications without writing them back to Storage.

## Editing state is not a save acknowledgement

Draft profile values, active gestures, undo history and redo history live only in memory. Previewing a gesture does not save settings. Committing an appearance change writes one appearance envelope; committing geometry writes only the geometry envelope.

A save readback equal to the current committed appearance is a no-op. It must not cancel a later draft or clear undo/redo history merely because that draft started before the earlier save finished. Equality is checked against committed settings, not against the draft.

An external preset-list-only change updates the list while preserving the current profile reference and profile editing session. A genuinely different committed profile replaces the profile and clears its conflicting draft/history. Geometry-only changes do not discard appearance history. Full chat replacement delegates to these same domain rules instead of maintaining a second conflict policy.

The connected regression tests in [`settingsConvergence.dom.spec.ts`](../../shared/runtime/settingsConvergence.dom.spec.ts) use the real repository, runtime and atoms while controlling Storage read delivery. They describe the save-A/edit-B, external-commit/readback, newer-local-write and preset-only cases.

## Import and backup

Backup version 2 contains enabled/theme, profile, presets and geometry. Locale remains browser-local and is not exported. Version 1 imports still use the compatibility decoder.

The file UI rejects imports larger than 1 MiB before JSON parsing. Valid backups contain at most 100 custom presets. Backup normalization returns complete `GlobalSettings` and `ChatSettings`; internal consumers do not cast an unvalidated theme or reinterpret a general record.

Import first flushes interactive writes, then writes enabled, theme, appearance and geometry with one bulk `storage.setItems` operation. In-memory state is replaced only after that operation succeeds and only while the application runtime is still alive. This does not add cross-context locking or distributed transactions.

## Failure behavior

| Failure | Result |
| --- | --- |
| Storage read fails | initialization fails; popup/settings show a reload fallback |
| Interactive write fails once | one delayed retry |
| Interactive write fails twice | shared persistence notice offers Retry |
| A newer external value arrives | obsolete failed retry is invalidated and the committed value is applied |
| Import bulk write fails | the import is not applied to in-memory state; the error is shown |
| Locale write fails | the selected language remains visible locally with an unsaved-state notice |

Focused tests also cover startup compatibility, isolated domain writes, retry invalidation, flush behavior and the bulk import boundary. See [`originAwareStorage.spec.ts`](../../shared/settings/originAwareStorage.spec.ts) and the [test contract matrix](../testing/contracts.md).

## Non-goals

This subsystem does not provide cross-device synchronization, field-level conflict merging, unlimited retries, automatic removal of compatibility keys, or a persistent background worker solely to coordinate settings.
