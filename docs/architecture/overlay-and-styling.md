# The overlay and iframe styling

The overlay combines a React panel over the fullscreen player with styles applied inside YouTube's chat iframe. Both use the current `ChatProfile`. This guide explains where those parts render, how placement works, and how styling is reversed when YouTube's iframe is returned.

For chat-source selection and session cleanup, see [Content runtime](content-runtime.md). For persistence and editing history, see [Settings, state, and storage](settings-and-state.md). The [iframe stylesheet guide](../../entrypoints/content/features/YTDLiveChatIframe/styles/README.md) describes individual CSS modules and YouTube surfaces.

## Rendering and ownership

The content session has two shadow roots:

- WXT creates `wxt-react-content` on `<body>` in [`createContentSession.tsx`](../../entrypoints/content/bootstrap/createContentSession.tsx). It hosts the React tree, state, and effects.
- [`PresentationLease.ts`](../../entrypoints/content/runtime/resources/PresentationLease.ts) creates `shadow-root-live-chat` on the current player. [`Content.tsx`](../../entrypoints/content/Content.tsx) portals the overlay into this root and the on/off switch into YouTube's player controls.

Content startup requests `content-scripts/content.css` through the extension's background asset handler and supplies its text to both shadow roots. WXT uses manual CSS injection; `PresentationLease` installs a local `<style>` instead of a resource link. No CSS fetch originates in the page, so its Service Worker and Connection Allowlist cannot reject the extension stylesheet. `PresentationLease` replaces the root when YouTube replaces the player and removes it during cleanup.

The host uses `transform: translateZ(0)` outside Firefox. As a result, fixed descendants such as the settings iframe use the player as their containing block on Chrome and the viewport on Firefox. Check both engines when changing that layout.

Within the panel, [`OverlayFrame.tsx`](../../entrypoints/content/overlay/OverlayFrame.tsx) owns the position, size, resize handles, and control rail. [`ChatSurface.tsx`](../../entrypoints/content/overlay/ChatSurface.tsx) owns clipping, hover bounds, and the shield that prevents iframe input during dragging. [`ChatViewport.tsx`](../../entrypoints/content/overlay/ChatViewport.tsx) renders the background, loading state, and iframe carrier. The runtime moves the selected chat iframe into that carrier; React does not create a replacement for a borrowed iframe.

[`useOverlayInteraction.ts`](../../entrypoints/content/overlay/useOverlayInteraction.ts) decides chat and control visibility from hover, keyboard focus, gestures, idle state, settings visibility, and document focus. A transparent hover bridge keeps controls reachable across the gap below the panel. The rail and its placement menu stay within the player; overflowing placement actions scroll. Chat remains visible while the window is unfocused.

Use the layer constants in [`zIndex.ts`](../../shared/constants/zIndex.ts) for stacking. Keep `data-ylc-*` hooks synchronized with the [E2E page object](../../e2e/pages/ExtensionOverlay.ts) and browser inspection/capture scripts when changing the DOM.

Screen-reader descriptions and live announcements use the shared `.ylc-visually-hidden` utility in [`controls.css`](../../shared/styles/controls.css), loaded by both content and settings roots. Keep their accessible relationships and live-region attributes on the owning controls.

## Geometry and input

[`useOverlayGeometry.ts`](../../entrypoints/content/overlay/useOverlayGeometry.ts) renders stored geometry against the current player size. Current settings store player-relative ratios and a `pinned` flag; legacy pixel settings are converted after a usable player rectangle is available. Size limits and conversion functions live in [`chatGeometry.ts`](../../shared/settings/chatGeometry.ts). Rendering and commits also pass through [`fitGeometryToViewport.ts`](../../shared/settings/fitGeometryToViewport.ts), which clamps position and size while preserving the 240 × 180 px minimum. Players smaller than that minimum can still overflow.

Drag and resize share [`usePointerSession.ts`](../../entrypoints/content/overlay/usePointerSession.ts):

1. A primary-button pointerdown starts one session. `data-ylc-resize-direction` on the handle selects resizing; the drag button starts movement.
2. Pointer movement updates an in-memory pixel draft, coalesced to animation frames. Resize calculations preserve the opposite edge before fitting the result to the available space.
3. Pointerup derives the final layout from the release coordinates and commits once as pinned geometry.
4. Escape, pointer cancellation, lost capture, window blur, or unmount cancels the draft without saving it.

The drag button's arrow-key controls and the placement menu move the panel in 10 px steps. The menu also resizes in 10 px steps. These actions commit pinned geometry and do not run during a pointer gesture or while settings are open.

Automatic placement applies only to unpinned geometry while no gesture or draft is active. [`collectPlayerObstacles.ts`](../../entrypoints/content/platform/youtube/collectPlayerObstacles.ts) measures captions, controls, menus, the end screen, and the settings area. [`autoSafeArea.ts`](../../entrypoints/content/overlay/autoSafeArea.ts) compares the current placement with corner candidates and moves only when its overlap and improvement thresholds are met.

[`useAutomaticOverlayPlacement.ts`](../../entrypoints/content/overlay/useAutomaticOverlayPlacement.ts) owns obstacle snapshots, observation, and automatic-placement decisions. Obstacle mutations are measured once per animation frame, and unchanged rectangles do not trigger a React update. Obstacle observation stops after a successful automatic move or when geometry becomes pinned; player-size observation continues. `useOverlayGeometry` schedules the reset, observation, and placement effects around player measurement and legacy migration in their original order. Auto-placement is separate from chat-runtime reconciliation.

Preset reordering has a separate [`usePresetReorder.ts`](../../entrypoints/content/features/YTDLiveChatSetting/components/PresetContent/usePresetReorder.ts) session. Pointer and keyboard moves share the order, preview, and announcement update. Each lifted gesture owns its listeners, pointer capture, and auto-scroll frame through one disposable resource owner; a callback from a finished gesture cannot affect the next one. The stationary scroll container or list captures the pointer so moving a row does not cancel the gesture. Preview changes stay in memory until confirmation. Escape, blur, lost capture, or an external list change cancels them.

## Settings previews and committed styles

The settings UI runs in its own extension-origin `settings.html` iframe and Jotai store. Continuous controls edit a draft; completing a gesture saves the appearance once. [`useSettingsStylePreview.ts`](../../entrypoints/settings/useSettingsStylePreview.ts) sends the draft profile to [`SettingsFrame.tsx`](../../entrypoints/content/settings/SettingsFrame.tsx) once per animation frame so the content overlay updates during editing.

Font search leaves IME composition keys to the input method. Enter chooses a font only after composition has finished, so confirming search text does not also change the saved appearance or undo history.

When Escape reaches a color-picker control or its trigger, it closes that picker and returns focus to the trigger before the settings modal can handle the key. Closing the picker finishes its active appearance gesture through the same cleanup used for removal. A browser-owned Escape can exit native fullscreen before content receives a key event; fullscreen teardown then closes settings and releases chat resources.

The receiver checks the message source, allowed origin, and profile schema. The preview is transient and remains visible until the matching Storage commit arrives, so an earlier save cannot overwrite a later gesture. Closing or reloading the settings frame clears it. Committed settings converge through Storage; see [Settings, state, and storage](settings-and-state.md) for ordering and failure behavior.

The effective profile reaches [`ResourceReconciler.ts`](../../entrypoints/content/runtime/ResourceReconciler.ts), which applies it to a usable chat document:

1. [`compileStylePatch.ts`](../../entrypoints/content/style/compileStylePatch.ts) converts appearance settings into document/body properties and a font selection.
2. [`applyStylePatch.ts`](../../entrypoints/content/style/applyStylePatch.ts) writes those properties and delegates font loading to [`fontLoader.ts`](../../entrypoints/content/style/fontLoader.ts).
3. The ordered modules in [`styles/index.ts`](../../entrypoints/content/features/YTDLiveChatIframe/styles/index.ts) consume the properties. [`iframeInitializer.ts`](../../entrypoints/content/features/YTDLiveChatIframe/utils/iframeInitializer.ts) injects their combined stylesheet once per document using a marker attribute.

The compiler owns color, spacing, font size, display flags, and blur values. YouTube's default membership color is read only when that mode is selected; custom colors compile directly from the profile. Font requests accept only names allowed by [`fontFamilyPolicy.ts`](../../shared/utils/fontFamilyPolicy.ts).

The React background and iframe document use `backdrop-filter`. Never apply `filter: blur(...)` to the iframe host, which would blur the chat text. The iframe body and inner surfaces use the configured backdrop value; the stylesheet guide explains surface tinting and cascade order.

Inline monetization offers use the profile's neutral surface and text colors, including the Super Sticker preview's close/return controls and the membership gift quantity selector. Preserve colored purchase cards, artwork, and paired sticker-backstory colors. Scope these rules to the borrowed chat document; outer membership and payment dialogs keep YouTube's native palette.

Viewer poll cards float over messages and share the support picker's minimum-opacity surface. Theme question/choice labels, neutral controls and result-bar fills within the poll boundary. YouTube continues to own percentage widths, selected/disabled state and voting; styling must not alter those values or submit an action.

## Restoring a borrowed iframe

Before styling a borrowed document, [`iframeAttachment.ts`](../../entrypoints/content/features/YTDLiveChatIframe/utils/iframeAttachment.ts) captures its original presentation through [`borrowedIframeStyleSnapshot.ts`](../../entrypoints/content/features/YTDLiveChatIframe/utils/borrowedIframeStyleSnapshot.ts). That module owns the inline properties, their priorities, the body's backdrop filters, and any existing custom-font style. Attachment still owns when each document is captured and restored. Release restores those values and removes extension classes, measurement variables, injected styles, and event fallbacks. Unrelated YouTube styles remain untouched. Managed iframes are removed on release.

When adding a property, update [`YLC_DOCUMENT_STYLE_PROPERTIES`](../../entrypoints/content/hooks/ylcStyleChange/ylcStyleConstants.ts) and the snapshot/restore code as needed. A property absent from the snapshot can remain in YouTube's native chat after release. Keep shared body classes and marker names in [`styleContract.ts`](../../entrypoints/content/features/YTDLiveChatIframe/constants/styleContract.ts).

Chat-only mode collapses the header and input through [`ChatChromeLease.ts`](../../entrypoints/content/runtime/resources/ChatChromeLease.ts). Its measurement reads and transition classes establish the animation's start height; removing them can turn the transition into a jump. Preserve header overflow outside chat-only mode so YouTube's chat-mode menu remains visible.

## Verification

Preset-list synchronization compares the ordered IDs by value. A newly allocated array containing the same order must not cause another state update; the full preset screen recreates that array while rendering. An externally changed order still cancels a stale reorder gesture and adopts the latest list. The connected [preset addition and application test](../../entrypoints/content/features/YTDLiveChatSetting/components/PresetContent/AddPresetItem.dom.spec.tsx) exercises this boundary through the actual list UI.

Use focused tests for the behavior being changed:

- Geometry, pointer cancellation, and automatic placement: [`useOverlayGeometry.spec.ts`](../../entrypoints/content/overlay/useOverlayGeometry.spec.ts), [`usePointerSession.dom.spec.tsx`](../../entrypoints/content/overlay/usePointerSession.dom.spec.tsx), and [`autoSafeArea.spec.ts`](../../entrypoints/content/overlay/autoSafeArea.spec.ts).
- Hover, keyboard focus, and controls: [`useOverlayInteraction.spec.ts`](../../entrypoints/content/overlay/useOverlayInteraction.spec.ts) and the deterministic [overlay interaction scenario](../../e2e/scenarios/live/overlayInteraction.fixture.spec.ts).
- Compiled styles, cascade order, and restoration: [`compileStylePatch.unit.spec.ts`](../../entrypoints/content/style/compileStylePatch.unit.spec.ts), [`iframe.spec.ts`](../../entrypoints/content/features/YTDLiveChatIframe/styles/iframe.spec.ts), and [`iframeAttachment.spec.ts`](../../entrypoints/content/features/YTDLiveChatIframe/utils/iframeAttachment.spec.ts).

Keep module imports self-contained and ordered, without CSS `@import` or cascade layers. The separate font-loader stylesheet may use an absolute Google Fonts import. Direct `display: none` in the iframe modules is limited to YouTube's native close control; hiding the iframe or its ancestors can throttle chat updates.

The overlay inspection and screenshot CLIs share the self-contained DOM reader in `scripts/verify/overlay-state-reader.mjs`. It reads the same shadow-DOM hooks and geometry in both tools; target selection, fullscreen interaction, output metadata, and success checks remain with each CLI.

Required checks are described in [Testing contracts](../testing/contracts.md). Interaction changes need real pointer/keyboard input, and compositor changes such as blur need pixel review in the affected browser; see [Browser verification](../maintainers/verification-browser.md).
