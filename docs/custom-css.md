# Custom chat CSS

## Settings integration

`SettingContent` keeps the existing Display, Colors, Text and Chat Elements
controls in their original order. The CSS group sits between Display and Colors.
It uses the same fieldset/legend, theme tokens, corner radii and button styles;
a small accent icon and border distinguish the optional customization area.
No new settings tab, application frame or preview-only toolbar is introduced.

The normal path is **choose a style -> Use this style**. One native selector groups
packaged starters and named personal copies. Code is hidden until Edit or paste
CSS is requested. Keep a named copy and copy deletion live inside that editor,
not alongside the primary Use action. The header has one Off operation. When
paused, the primary button explicitly offers to resume with the selected source.

The existing appearance settings remain enabled and keep their own Undo/Redo.
CSS does not rewrite the profile, activate a different appearance preset, or
clear style history. A short note explains that CSS declarations can override
those controls. Outline's background-opacity prerequisite points to the existing
Background Color setting rather than introducing a second background control.

## Sources and illustrations

The six starter sources and contributor instructions are in
[`shared/settings/chatCssPresets`](../shared/settings/chatCssPresets/README.md).
`chatCssPresets.ts` remains the single catalog. Explicit raw imports do not inject
these styles into the settings Document. Starters consume no saved-copy slots.
The first starter may be suggested when no source exists; rendering that
suggestion does not create a draft, save anything or enable CSS.

Selection copies source into page-local editing state, never into chat. Moving
between recoverable starters or copies does not ask for confirmation. Replacing
genuine, unapplied edits that are not already present in the saved list does.
Cancel leaves the text and source identity intact. The selector uses separate
`preset:` and `saved:` namespaces, including when their IDs happen to match.
Edited text is identified as an unapplied draft, not mislabeled as its original.

`ChatCssExample` draws a small, fixed illustration only when the complete source
exactly matches a packaged starter. It is an example, not the actual YouTube
Document or a live preview of profile changes. Arbitrary, edited and imported CSS
show a neutral custom-CSS placeholder and the trust warning. No editable CSS,
HTML, style node or iframe is executed in the example. Catalog updates do not
silently update saved or active copies.

## Ownership

| Data | Storage/domain |
| --- | --- |
| Current CSS and enabled preference | `ylc-custom-css` / `customCss` |
| Named CSS-only copies | `ylc-saved-chat-css` / `savedChatCss` |
| Independent pause preference | `ylc-custom-css-suspended` / `customCssSuspended` |

The existing repository owns queues, bounded retries, readback confirmation and
external events. CSS is not part of ChatProfile or appearance presets. Drafts,
editor mode, registration name, operation feedback and local stop intent are
page-local Jotai state. They are never automatically persisted or exported.
`CustomCssEditorUi.expanded` now means the optional code editor is open, not that
the entire settings group is hidden. The group and its primary action stay visible.

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
Off supersedes a failed resume through the pause domain. A retry of a failed
source write while paused may save that source, but does not itself resume it.

Source failures and recovery failures remain visible outside the hidden editor.
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

Returning to style selection does not discard text or the registration name.
The editor state also survives switching the existing Settings/Presets tabs.
Opening code editing pins the displayed text against later external changes.
Saved-copy deletion leaves both the draft and currently applied source intact;
external deletion shows a missing-source notice rather than erasing the draft.
Reload and overwrite confirmations hold snapshots and recheck changes before
executing. Baselines advance only for the submitted, still-current draft and a
matching committed source, including a source saved before a failed resume.

Names are checked for trimmed duplicates and capacity before submission. The
name form appears only on request; the preset title is suggested only then.
Canceling that form clears only its name. Failed saves retain both inputs; an old
completion must not clear a newly opened form with the same name. Registration
never applies CSS. A full saved list does not block source editing or Use.

The textarea is LTR, uses native text Undo/IME, and stays read-only rather than
disabled during saves so selection and copying still work. Control/Meta+Enter
uses the same explicit action as the button. Modified Enter in the name field
and composing events do not accidentally submit it.

Escape dismisses the innermost confirmation or name form first, otherwise leaves
the code editor without discarding it. A subsequent settings-close request still
uses the existing unapplied-text/name/in-flight-save warning. Escape in that
close confirmation cancels only the confirmation, including when a save finishes
while it is open. Focus returns to the corresponding editor, selector or prior
settings control; a completed operation must not steal focus into a hidden editor.
When Off removes its button, focus returns to Use unless the user moved elsewhere.
Beforeunload remains a best-effort browser warning, not a persistence mechanism.

Japanese and English (including US/GB/AU) use the focused action wording. The
existing translation keys and locale inventory are unchanged. Other languages
retain their existing translations/fallbacks. Runtime locale arrays are produced
by the existing compiler, never patched by index.

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
