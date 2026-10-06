# Custom chat CSS

## Settings integration

The settings panel has three tabs: **Settings**, **Custom CSS** and **Presets**.
A newly mounted panel starts on Settings. `SettingContent` keeps the existing
Display, Colors, Text and Chat Elements controls in their original order;
`CustomCssSection` lives in the dedicated Custom CSS tabpanel. It uses the same
accessible fieldset/legend, theme tokens and button styles. Its heading stays
visually hidden because the tab already names the section. Undo, Redo and Close remain shared header controls. The header
can wrap these controls onto another row in a narrow panel.

The CSS textarea is always visible in the Custom CSS tab. Without a committed
source or local draft, it starts blank. Users paste or edit CSS, then choose Use
or Save beside the editor. A single Choose a style button reveals packaged
starters as cards with names and fixed chat thumbnails. The buttons also have
accessible labels naming the source they load. Choosing
a card closes the picker and focuses the editor; no starter is preselected on
first use. The status line has one Off operation. When paused, Use explicitly offers to resume with the chosen source.

When personal copies exist, a collapsed Saved disclosure shows their count.
Opening it reveals rows with Load, Use and Delete operations. Load
copies the stored text into the textarea; Use explicitly applies that row's CSS
through the same activation guards as the editor. Delete removes only the named
copy. Editing or using a loaded copy never changes its saved original. Saving
creates a new named copy, and an existing name is rejected rather than overwritten.

The existing appearance settings remain enabled and keep their own Undo/Redo.
The packaged starters consume the existing style variables, so Text Color, Text
Size, Font Family and Spacing still update the styled comments after Use. Their
neutral surfaces and borders also follow the existing color tokens; Background
Color continues to control the chat backdrop. CSS does not rewrite the profile,
activate a different appearance preset, or clear style history. Handwritten CSS
with fixed declarations can still override the ordinary controls. Outline's
background-opacity prerequisite points to the existing Background Color setting
rather than introducing a second background control.

## Sources and previews

The nine starter sources and contributor instructions are in
[`shared/settings/chatCssPresets`](../shared/settings/chatCssPresets/README.md).
`chatCssPresets.ts` remains the single catalog. Explicit raw imports do not inject
these styles into the settings Document. Starters consume no saved-copy slots.
The visual picker starts closed. Merely opening the tab does not load starter
text, create a draft, save anything or enable CSS.

Loading a starter or personal copy changes page-local editing state, never chat.
Moving between recoverable starters or copies does not ask for confirmation.
Replacing genuine, unapplied edits that are not already present in the saved
list does. Cancel leaves the text and source identity intact. Source identity
keeps starter and saved-copy IDs separate, including when those IDs match.
Edited text is identified as an unapplied draft, not mislabeled as its original.

The visual picker uses `ChatCssExample` for small, fixed illustrations. These
thumbnails explain the arrangement without executing any CSS. Compact cards
show names and thumbnails without the illustration caption. Loading an exact
packaged source also shows `ChatCssPreview` above the always-visible textarea.
This selected preview renders representative YouTube-shaped comments with the
actual packaged source, production iframe styles and current effective appearance
settings in an isolated iframe. The selected preview shows the chat alone,
without repeating the card description. Its Adjust colors and text size button
opens the ordinary Settings tab. Returning to Custom CSS reflects the chosen
colors and text size in this preview as well as the actual chat.

The iframe has an empty `sandbox` and an opaque origin, with no script or
same-origin permission. Its content is built only from the trusted catalog and
escaped fixed sample text. Editable, imported and saved CSS is never executed in
a preview; only a byte-for-byte match to a packaged starter can render there.
Arbitrary or edited sources have no executable preview and retain the existing
trust warning. Loading or previewing never applies CSS or saves a profile. Catalog
updates do not silently update saved or active copies.

Three starters change the arrangement of normal messages, in addition to the six
existing text, spacing and decoration starters:

| Source | Message arrangement |
| --- | --- |
| `messenger` | A round avatar beside a bubble, with the author above the message |
| `stage` | A card with a separate author header and message body |
| `timeline` | An avatar beside a vertical content line, with a separator between messages |

The packaged rules target non-deleted normal messages directly inside the chat
item list. Their nested layout uses YouTube's `#content`, author chip and message
nodes. A simpler renderer without that wrapper keeps a usable fallback layout.
The sources preserve author/icon visibility preferences and semantic text colors;
paid messages and the composer remain outside their selector scope. The fixed
thumbnails explain the intended arrangement, and the selected isolated preview
shows how that packaged source combines with ordinary appearance settings. Only
Use applies the selected source to the actual chat Document.

## Ownership

| Data | Storage/domain |
| --- | --- |
| Current CSS and enabled preference | `ylc-custom-css` / `customCss` |
| Named CSS-only copies | `ylc-saved-chat-css` / `savedChatCss` |
| Independent pause preference | `ylc-custom-css-suspended` / `customCssSuspended` |

The existing repository owns queues, bounded retries, readback confirmation and
external events. CSS is not part of ChatProfile or appearance presets. Drafts,
selected source, registration name, operation feedback and local stop intent are
page-local Jotai state. They are never automatically persisted or exported.
The textarea has no separate collapsed mode or editor-open state.

The unreleased WIP profile-level CSS field is not maintained as another input or
migrated into an automatically enabled source. No new storage schema or second
persistence implementation is required for the focused UI.

## Use, Off and recovery

`activate(css, expected)` is the explicit Use/Resume action. It holds the existing
normal-action lock for both phases: confirm the requested source, then lift a
pause if needed. A source-write failure never starts the resume phase. A failed
resume can leave the new source saved while CSS remains paused or unconfirmed;
the UI retains the text and reconciles only that matching confirmed baseline.
It must not announce activation merely because the first phase succeeded.

Off calls `suspend(true)`, keeps the visible source in a draft and leaves the
current source and personal copies intact. It is available during a normal save
or a pending resume. The page-local stop revision records local Off requests and
incoming true pause notifications, even when true was already stored. A Use
waiting for its source write cannot lift a later stop. Recovery request identity
also prevents an old resume completion from clearing a newer local stop latch.
An external Off during the resume phase also installs that latch immediately,
so a late false readback cannot briefly enable CSS before its Promise settles.
Both successful and failed resume completions check the stop revision. A
successful readback that still confirms Off finishes recovery quietly. If the
value disagrees or the old write/readback failed, the local latch remains set
and the UI offers a stop retry rather than claiming confirmation from an earlier
notification. An obsolete failure does not replace the result of a newer local
stop or publish a misleading Apply error.
The revision is coordination state, not a new persisted field or cross-tab lock.

The lower-level Apply and Disable actions keep their existing contracts. Plain
Apply writes the source without resuming; Disable preserves the source while
clearing its enabled preference. Saving a named copy, selecting a starter and
importing a backup do not call the explicit activation command. The settings UI
does not present Disable and global pause as two competing Off choices.

Committed atoms change through repository notifications, not optimistic action
snapshots. Missing, invalid or failed CSS readbacks remain in the existing failed
queue; common Retry reuses the same source and saved-copy IDs, and flush rejects
unresolved failures. New local intents or confirmed external updates supersede
older retries. Non-CSS settings retain their existing best-effort readback policy.
Pause-domain work checks its original supersession version before its first
write as well as before delayed retries. A resume still waiting for the previous
operation, including a queued common Retry, cannot overwrite an external Off
already received by this repository. A later explicit resume remains available.
This cannot cancel a storage write that has already started.
Pause-domain readback failures retain the original intent's supersession version,
not a newer version captured after an external stop. This prevents common Retry
from reviving an obsolete resume when the stop arrived before readback began.
Other domains keep their existing confirmation and retry behavior.
Off supersedes a failed resume through the pause domain. A retry of a failed
source write while paused may save that source, but does not itself resume it.

Source failures and recovery failures remain visible beside the editor and actions.
The header distinguishes a confirmed state from a pending/unconfirmed result;
it does not show In use while a source save remains unconfirmed. A matching
confirmation from common Retry can reconcile an earlier recovery failure.
Normal actions reject concurrent submissions. Disposed runtimes do not publish
late feedback, and old UI completions cannot overwrite a later draft session.

These guards do not make the separate storage domains a distributed transaction.
Other settings pages can write concurrently, and the existing last-writer-wins
constraint remains. A locally requested Off is not proof that every chat tab has
received it. Unresponsive tabs can require disabling the extension and reloading.
Avoid simultaneous editing of the same saved list from multiple windows.

## Editing and accessibility

The draft, selected source, registration name and open name form survive switching
between Settings, Custom CSS and Presets. Switching tabs does not apply CSS or
save a draft. Editing or explicitly loading a source pins the displayed text
against later external changes. The editor and saved-copy list share this draft;
there is no separate transition into or out of code editing.
Saved-copy deletion leaves both the draft and currently applied source intact;
external deletion shows a missing-source notice rather than erasing the draft.
Reload and overwrite confirmations hold snapshots and recheck changes before
executing. Baselines advance only for the submitted, still-current draft and a
matching committed source, including a source saved before a failed resume.

Each tab controls the active tabpanel through `aria-controls`; the panel names
its selected tab through `aria-labelledby`. Only the selected tab participates in
Tab navigation. Opening or reopening the dialog focuses the panel; Tab then
enters the selected tab. Reopening the same mounted dialog retains its selected
tab. Left and Right arrows select and focus adjacent tabs, wrap at either end,
and follow the visual direction in LTR and RTL locales. Arrow selection retains
focus on the selected tab even when a restored registration form would otherwise
focus its name input on mount.

Names are checked for trimmed duplicates and capacity before submission. The
name form appears only on request; the preset title is suggested only then.
Canceling that form clears only its name. Failed saves retain both inputs; an old
completion must not clear a newly opened form with the same name. Registration
never applies CSS. It always creates a new copy with a new ID; there is no rename
or update action. Changes to a loaded copy can be kept under a different name,
while its original row remains available. A full saved list does not block source
editing or Use.

The textarea is LTR, uses native text Undo/IME, and stays read-only rather than
disabled during saves so selection and copying still work. Control/Meta+Enter
uses the same explicit action as the button. Modified Enter in the name field
and composing events do not accidentally submit it.

Escape dismisses the innermost confirmation or name form first. With neither
open, it follows the settings-close guard; it never collapses the textarea or
changes an editor mode. The section owns this ordering regardless of whether
focus is on the name input, CSS, or a button. During a name save,
Escape is consumed without canceling the request or bubbling to close Settings.
A deletion/overwrite confirmation takes priority over the name form.
A subsequent settings-close request still uses the existing
unapplied-text/name/in-flight-save warning, including when Settings or Presets is
the selected tab. Canceling the close keeps the draft and selected tab; confirming
the close clears the page-local draft and registration state. While that close
confirmation is open, the panel handles Escape before its children, even if focus
has moved back to the CSS or name input. It cancels only the close confirmation, including when a
save finishes while it is open; it does not discard the name or hide the textarea.
Composing Escape events remain ignored. Focus returns to the corresponding
editor, source control or prior settings control. A registration completion restores
focus only if it still belongs to the submitting form or was lost when the form
was removed, never from another control or a settings-close confirmation.
A completed operation must not focus an inactive Custom CSS tabpanel. When Off
removes its button, focus returns to Use unless the user moved elsewhere. These checks and
close-focus snapshots use the containing Document or ShadowRoot, not the outer
document's shadow host. A null ShadowRoot activeElement alone is not proof of
lost focus: an outside-document control may now own it. Off and registration
completion also check that outer focus before restoring a control.
Beforeunload remains a best-effort browser warning, not a persistence mechanism.

Japanese and English (including US/GB/AU) use wording for the always-visible
editor and saved-copy actions. The locale inventory is unchanged. Translation
changes belong in the locale source files; runtime arrays are produced by the
existing compiler, never patched by index.

## Input and backup boundaries

CSS is limited to 64 KiB of UTF-8 source and a separate 256 KiB serialized-domain
budget. Up to 20 named copies are accepted; names must be nonempty, at most 100
characters, and unique after trimming. The saved list has a 256 KiB JSON budget.
Appearance presets have a separate 384 KiB budget. Export checks the actual
pretty-printed backup against the 1 MiB total limit. Source is never truncated.

Backup v3 includes current CSS and saved copies, not locale or pause preferences.
Versions 1 and 2 remain supported without enabling CSS from extra fields. Imported
CSS is always disabled; a backup cannot resume it. Invalid source/copies are
rejected instead of silently normalized to empty strings. CSS readbacks, watch
events and import readbacks validate the data. The backup reader distinguishes
omitted fields from explicitly invalid null/undefined fields.

## Document lifecycle and trust

Content observes the committed source and pause preference and sends the effective
CSS to ChatRuntime/ResourceReconciler. Each reconciler owns one CustomChatStyles.
Updating the Document and source together avoids briefly attaching old CSS while
stopping or replacing the iframe. Unavailable/replaced Documents, iframe return
and runtime cleanup release only the owned stylesheet. Load callbacks verify the
current lease and session before changing resources; missing heads do not block
cleanup. The reconciler retains the requested source for later valid chat.

The owned style uses textContent, never HTML parsing. Identical text is not
rewritten; foreign styles sharing its marker are not removed. At an existing
synchronization point it returns to the end of head to preserve source ordering
when the cascade otherwise ties. Specificity, important rules and layers still
apply. Changed CSS refreshes existing composer/header measurements without a new
continuous observer. The video page and settings UI are not custom-CSS targets.

This is a trusted-input feature, not a sanitizer. CSS can contact remote sites,
hide controls or cause rendering load. Browser CSP, cascade, relative URLs and
error recovery apply normally. A successful save does not prove correct selectors
or appearance. There is no JavaScript execution, remote theme store, live user-CSS
preview, multiple-source composition or replacement chat renderer.

Verification should cover the standard repository gates and Chrome/Firefox with
live/replay, navigation, iframe replacement, storage failures/retries, Off/Resume,
IME/focus and narrow settings panels. Static source/illustration checks do not
replace extension runtime verification.

`overlayInteraction.fixture.spec.ts` exercises the three message layouts through
the Settings visual picker and Use button in a testing extension. It supplies
representative nested normal-message markup inside the actual leased iframe and
checks computed styles and author/message geometry, including an avatar-free row.
Paid, deleted and composer samples share their usual IDs to catch rules that
escape the normal-message scope. The same scenario transitions from managed live
chat to playable borrowed replay, then exits and re-enters fullscreen to check
stylesheet release and reapplication. This deterministic fixture does not prove
compatibility with every current YouTube renderer or replace Chrome/Firefox
checks on real chat.
