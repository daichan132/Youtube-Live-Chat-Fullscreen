# iframe styles

These styles are injected into YouTube's live chat iframe document. The module order in `index.ts` is part of the cascade contract.

| Module | Responsibility |
|---|---|
| `tokens.css` | Extension CSS variable defaults |
| `frame.css` | Transparent iframe surfaces and native chrome trimming |
| `core-theme.css` | Shared text, icon, button, and control colors |
| `menus.css` | Dropdown, overflow menu and participant-list header surfaces |
| `banners.css` | Pinned banners, notices and viewer poll colors |
| `leaderboard.css` | Top fans / live viewer leaderboard |
| `composer.css` | Input, restricted state, emoji picker, and reactions |
| `chat-only.css` | Measured header/input collapse transitions |
| `monetization.css` | Super Chat, Super Sticker, and product picker flows |
| `message-layout.css` | Message typography, spacing, author/avatar, and display toggles |

## Surface coverage

Keep stateful surfaces on the component boundary that replaces the chat list. The shared frame and message list stay transparent, and body transparency is owned by `frame.css` — a borrowed iframe must not gain an inline background that then needs restoring. Blur is applied in two places: the React background layer behind the iframe samples the parent-page video, and the iframe body carries its own `backdrop-filter` so surfaces inside the document blur what is behind them. Inline composer and monetization surfaces use a low-alpha tint derived from the configured background color, and apply the configured blur to their outer backdrop. The floating support product picker instead uses the configured RGB at a minimum 96% opacity: it overlaps live messages, so a subtle tint makes two layers of text compete. This exception does not change the main chat background or its transparency. The monetization loading panel clears only YouTube's opaque fill; the React background continues to own the configured color and opacity.

| UI state | Surface owner | Boundary |
|---|---|---|
| Signed-in input, restricted input, legacy sign-in prompt, current signed-out prompt | `composer.css` | Direct child of `#input-panel` |
| Jewels gift entry icon and neutral button | `composer.css` | `#jewels-gifts-button yt-pdg-gift-button > button` (enabled only) |
| Emoji picker search control | `composer.css` | `yt-emoji-picker-renderer #search-panel` |
| Participant-list header and back icon | `menus.css` | `yt-live-chat-participant-list-renderer #header` / `#back-button` |
| Chat mode, header overflow, and message action menus | `menus.css` | YouTube dropdown / popup outer surface |
| Jewels catalog title, neutral controls and unselected cards | `monetization.css` | Engagement panel containing `yt-pdg-gift-collection-view-model` |
| Product picker, Super Chat, Super Sticker pack and preview | `monetization.css` | Each monetization renderer root |
| Membership gift quantity offer | `monetization.css` | `ytd-sponsorships-gift-offer-renderer` and its header/body |
| Viewer poll card, question, choices and results | `banners.css` | Action panel containing `yt-live-chat-poll-renderer` |
| Top fans / XP panel | `leaderboard.css` | `PAlive_viewer_leaderboard` engagement panel |

Do not theme `yt-live-chat-message-renderer` globally. YouTube also uses it for regular chat content; the signed-out prompt is identified only as its direct `#input-panel` child.

Restricted participation has an additional native `#container` surface inside its renderer. Keep that inner fill transparent so the outer composer owns the tint once, and theme its explanation labels explicitly. Styling only the renderer root leaves a white footer when YouTube uses its light theme under a dark overlay.

## Guardrails

- Keep the import order stable unless a computed-style comparison proves that changing the cascade is safe.
- Do not use CSS `@import`; the final string is installed in the iframe document and must be self-contained.
- Do not add cascade layers without measuring them against YouTube's unlayered author styles.
- Keep direct `display: none` limited to YouTube's native close control. Hiding an iframe or its ancestor this way can throttle chat updates.
- Blur is applied as `backdrop-filter`, never as `filter` on the iframe host, which would blur the chat text itself. `compileStylePatch` writes the configured value to the iframe body and publishes it as `--extension-yt-live-backdrop-filter` on the document element; `tokens.css` declares the variable's `none` default and menus, composer, and monetization surfaces reuse it for their own backdrops.
- Keep the expanded chat header above the ticker and its overflow visible because YouTube mounts the chat mode dropdown inside a transformed header stacking context. Clip the header only in `chat-only-display`.
- Add a rule to the narrowest responsible module and preserve the `custom-yt-app-live-chat-extension` scope.
- Keep neutral SVG controls on the configured extension font color so they remain legible against customized panel backgrounds. Preserve a YouTube-owned semantic color only through a selector scoped to that semantic component; the Top fans crown entry point is the intentional header exception.
- Avoid wildcard descendant color rules. Apply text color to known labels and icon color to known icon/SVG boundaries so disabled and semantic states can be reviewed independently.

The Jewels gift entry uses `yt-pdg-gift-button` outside the legacy `#picker-buttons`. Its enabled entry button and neutral icon/SVG follow the configured text color. The resting background is transparent like adjacent composer icons; only hover adds the themed interaction tint. Disabled buttons and the colored gift artwork retain native styling; no gift action or purchase flow is intercepted.

The current rounded composer field has its own `#input-container` fill, separate from the outer input panel. It uses the foreground-derived control tint so a native black fill cannot disappear on a dark custom background. Emoji category headings and the native paper-input search label/placeholder use the configured secondary text color; both standard and membership-upsell category title bars use the control tint instead of native white. The search clear icon follows the primary color. The search input overrides the native paper-input inheritance so typed text keeps the configured primary color. Viewer-engagement notice action links use the primary text color at their button boundary; the notice's YouTube icon remains semantic artwork. Super Sticker pack backstories intentionally retain their paired native white surface and dark text.

The Jewels catalog replaces the chat list with an engagement panel containing `yt-pdg-gift-collection-view-model`. Its title, back/information icons, and enabled unselected card surfaces/labels follow the profile. Selected send cards retain their native foreground/gradient pair; disabled cards, Jewels balance chips, token images and gift artwork are not recolored. Scope header rules to the panel containing the collection so other engagement panels keep their own semantics.

The participant-list header and back icon follow the profile rather than YouTube's fixed light header. Participant names keep the shared secondary/member colors, and owner chips retain their native paired foreground/background.

The purchase-preview header's current `#close` icon follows the primary color, and the Super Sticker preview's `#back-button` return-action surface uses the control tint. The colored purchase button and card, and the white sticker-pack backstory with its paired dark text, keep their native colors.

The membership gift quantity offer uses the profile's panel tint, with transparent inner header/body fills. Theme its title, nested offer-section/quantity labels, description, close icon and unfilled quantity actions at their component boundaries: YouTube uses opaque native color tokens here, so overriding `--yt-spec-text-*` alone does not recolor the labels. These rules stay inside the offer renderer; external membership and payment dialogs keep YouTube's native palette.

The viewer poll floats above messages and uses the same minimum-96%-opacity surface as the support picker. Its question, metadata, choices and neutral controls follow the primary/secondary palette. Poll-local styles also tint the result bars; bar widths, selection markers, disabled attributes and voting behavior remain owned by YouTube. No poll-editor or other action-panel renderer is themed by these rules.
