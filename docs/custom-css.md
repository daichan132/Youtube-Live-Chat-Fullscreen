# Custom chat CSS

## Product scope

The existing appearance settings and preset list remain intact. A collapsible
Custom CSS section is appended to Settings. Paste ordinary CSS, explicitly apply
it, and optionally register a named copy. Samples and saved registrations only
populate the editor. Neither selecting nor registering CSS applies it.

Apply persists the current CSS source and enabled preference. Disable preserves
the source. Register stores only an ID, name and CSS; deleting a registration does
not change the active source or the editor copy. One stylesheet is active at a
time. The six packaged starter presets use the same editor and application path.
They are listed separately from personal registrations and consume no slots.
The selected source has a collapsed description below its selector, including
prerequisite notes. Selection survives tab switches and cancellation.
An edited copy can explicitly reload either its starter preset or its saved
registration after replacement confirmation. Deleting a registration elsewhere
leaves the loaded editor copy intact and displays a missing-source notice.
Opening Register suggests the preset title only when the name is empty; loading
alone never invents an unsaved name. Catalog changes do not update existing copies.

The preset sources and contributor instructions live in
[`shared/settings/chatCssPresets`](../shared/settings/chatCssPresets/README.md).
`chatCssPresets.ts` is the single list used by the UI. Explicit raw imports keep
preset styles out of the settings Document.

There is no live preview, minimal base mode, gallery, remote theme subscription,
UserCSS preprocessor, per-message DOM decoration or JavaScript execution.

## Ownership

| Data | Storage/domain |
| --- | --- |
| Current CSS and enabled preference | `ylc-custom-css` / `customCss` |
| Named CSS-only registrations | `ylc-saved-chat-css` / `savedChatCss` |
| Independent pause preference | `ylc-custom-css-suspended` / `customCssSuspended` |

The existing repository owns persistence queues, bounded retries, readbacks and
external storage events. Current CSS is not part of ChatProfile, appearance
presets or style Undo/Redo. Draft text, editor UI, pending operations, feedback and
local recovery intent are page-local Jotai state, never automatically persisted.

The previous unreleased WIP profile-level CSS field is removed, not maintained as
a second input or migrated into an automatically enabled CSS setting.

## Applying and confirming writes

Actions change committed atoms only through repository notifications. Completion
does not blindly write an earlier requested snapshot into the store. A write
without a matching confirmation is reported as unconfirmed; it may already have
reached storage. Drafts stay available and the user can inspect the current state.
For the three CSS domains, a missing, invalid or failed readback stays in the
repository's failed-domain queue. Common Retry reuses the original snapshot
(including registration IDs); flush rejects until the failure is resolved or
superseded. Non-CSS settings keep their existing best-effort readback behavior.
A newer local intent or a confirmed external change supersedes the old retry;
an obsolete readback failure must not re-enqueue it.

When an enabling write fails, Disable remains available even if the
previous confirmed source is disabled. It publishes a new disabled intent to
supersede the failed enabling request before any common Retry. The editor keeps
the failed source. Conversely, Apply remains available for an unchanged source
when the CSS domain has a failed save, so the user can supersede a failed disable
without first changing their text. Both operations use the repository's queue,
not a separate UI retry flag. Confirmed commits clear stale persistence feedback
only for the corresponding operation domain; imports also clear obsolete success notices.

Normal CSS actions are mutually exclusive within one runtime. Pending recovery
also blocks them so a save presented as "keep paused" cannot race with a resume.
Pausing is still possible during an ordinary save or a pending resume. Old recovery
completions cannot clear a newer local stop intent. A local intent is not evidence
that other chat tabs received the pause. UI distinguishes persisted pause, pending
pause and unconfirmed recovery. A matching confirmation received from the common
repository Retry action clears an earlier failed recovery notice; an older resume
cannot clear a newer failed stop. Disposed runtimes do not publish delayed feedback. Unresponsive tabs may require extension disable
and reload; recovery is not a browser-process watchdog.

Overwrite/delete confirmations hold a snapshot of the value being confirmed.
Actions reject known changes to that value. This does not introduce a distributed
transaction: simultaneous writes from separate extension pages retain the
repository's last-writer-wins policy. Avoid editing registrations in multiple
settings windows at once. The local guard is not a cross-context lock.

## Input and capacity

CSS is limited to 64 KiB of UTF-8 source, with a separate 256 KiB JSON domain
budget. At most 20 registrations are accepted; names are nonempty, at most 100
characters, and unique after trimming. Their serialized list is limited to
256 KiB. Appearance/profile presets have a separate 384 KiB budget, leaving space
for wrapper fields and geometry inside the 1 MiB backup limit. Export checks the
actual pretty-printed backup serialization as well. Source is never truncated.

Backup version 3 includes current CSS and registrations, but neither locale nor
pause state. Versions 1 and 2 remain accepted, with no CSS enabled from extra
fields. Imported version 3 CSS is always disabled. A backup cannot resume CSS.
Invalid imported source/registrations are rejected rather than silently
normalized or shortened. The three CSS domains validate write readbacks and bulk
import readbacks as well as storage events; malformed data is never treated as a
confirmation just because startup recovery could normalize it. The CSS backup
reader distinguishes omitted fields from explicitly invalid null/undefined
fields: omission can use defaults; a present invalid field is rejected.

## Document lifecycle

Content observes the committed CSS and pause preference, sending the effective
source to ChatRuntime/ResourceReconciler. Each reconciler owns one CustomChatStyles
instance. The reconciler retains the requested source for a later valid chat.
`CustomChatStyles.update(document, css)` receives the target and source together,
so replacing a document during a stop never briefly attaches previous CSS.
It releases its own element when the document is replaced/unavailable, the iframe
is returned, or the runtime is cleared. A load event releases the old document
before deferred initialization. The load callback checks both the current lease
and its scope before mutating resources. Head replacement cannot prevent cleanup.

Source is assigned as style.textContent, independently of built-in styles. Equal
source is not rewritten; other styles with the same marker are never removed.
At an existing synchronization point, the owned style is moved to the end of head
if another node was appended later. This preserves source-order precedence where
the cascade otherwise ties. It does not override selector specificity, important
declarations or cascade layers, and there is no continuous source-order watcher.
The settings UI and video page are not custom-CSS targets. CSS can affect measured
header/composer heights, so the existing chrome measurements are refreshed on a
source change. No unbounded repair observer is introduced.

## Editor behavior

The open/closed section state, text, registration name and feedback survive
switching existing tabs. Loading another source asks before replacing unapplied
text; cancellation also preserves the selected registration. Confirmed deletions
and overwrites recheck the requested snapshot. Closing warns about drafts, names
or a pending operation, but permits explicit close without pretending to cancel
an already-started write. Escape dismisses an open close confirmation rather than
closing Settings, even if the pending save has since finished. Cancellation
returns focus to the prior control when it still exists and is visible, otherwise
to the active tab. An externally closed Settings session drops its old close
confirmation without discarding the draft. Beforeunload is only a best-effort
browser warning.

The editor's main row is Apply / Save / Disable. Save opens the named-copy
form; it does not apply CSS. Disable removes the current effect without deleting
text. Deleting a saved copy stays with its source, away from the main action row.
While paused, Apply is relabeled Update with the pause state; saving content never
implies a resume. The recovery control remains available during an ordinary save.

One header badge reports enabled/disabled/paused/unconfirmed state and unapplied
edits. The textarea retains an accessible state description without repeating the
same explanation visually. Errors, external changes, destructive confirmations
and pending recovery remain visible. The read-only editor stays selectable.

Long instructions, source descriptions and trust warnings use native details
closed by default. They have no saved open state. Escape closes only the focused
help disclosure and returns focus to its summary (except during IME composition).
The outer editor ignores bubbled nested toggle events: opening help must not
change the editor's saved expansion flag. Source reload/delete controls stay
outside the disclosures and remain available without opening a help panel.

Japanese and English (including US/GB/AU) labels are shortened in the existing
locale catalog. Other locales keep their existing translations/fallbacks. No new
translation keys, locale inventory, persistence flags or dependencies are added.

Registration reports duplicate trimmed names and a full library before sending
a write. A full library does not block editing or applying CSS. The action layer
remains the authority for capacity and concurrency checks. Canceling registration
clears only the name and returns focus to the editor; CSS is retained. Unmodified
Enter submits the name, Escape cancels that subform, and composing key events do
neither. A failed registration keeps both inputs and returns focus to the name
when the section remains open. A completed write never focuses a collapsed editor.
Registration pins the displayed source in a draft even when it has not been
edited. Its completion checks that draft's identity before clearing the name, so
a later editor session with the same name is left alone. Collapsing the section
is not a new draft session. Disable also pins the visible source and advances only
the submitted draft's baseline after its own confirmed write. Existing external
conflicts and later drafts are not cleared by an old disable completion.

Source text is LTR and retains native text Undo and IME behavior. While saving,
the editor is read-only rather than disabled, so source remains selectable and
copyable. Changing controls are disabled. Escape in an inner confirmation cancels
that confirmation and returns focus to the editor, without closing Settings. The UI uses
existing theme variables, explicit state text and focus outlines. Selectors use
auto-fit grid sizing and actions wrap at the component's available width, not
the browser viewport. The CSS textarea uses 13px monospace type with 1.7 line
height and a visible capacity indicator. It does not inject user CSS into a preview of the settings screen.

## Trust and validation

This is a trusted-input customization tool, not a CSS sanitizer. CSS may request
remote resources, hide controls or impose rendering load. Normal browser cascade,
CSP, relative-URL resolution and error recovery apply; the extension does not
bypass them. A successful save is not proof of correct selectors or appearance.

Regression sources cover actions, drafts, recovery, storage/import, close behavior
and stylesheet ownership. Tests, typecheck, lint, builds and real-browser checks
were not run during preparation of this change. Chrome/Firefox, live/replay,
iframe replacement, persistence failures and keyboard accessibility remain local
verification tasks.
