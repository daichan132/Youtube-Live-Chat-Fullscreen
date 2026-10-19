# iframe styles

These styles are injected into YouTube's live chat iframe document. The module order in `index.ts` is part of the cascade contract.

| Module | Responsibility |
|---|---|
| `tokens.css` | Extension CSS variable defaults |
| `frame.css` | Transparent iframe surfaces, native sizing, chat scrollbars and chrome trimming |
| `core-theme.css` | Shared text, icon, button, and control colors |
| `menus.css` | Dropdown, overflow menu and participant-list header surfaces |
| `banners.css` | Pinned banners, notices and viewer poll colors |
| `leaderboard.css` | Top fans / live viewer leaderboard |
| `composer.css` | Input, restricted state, emoji picker, and reactions |
| `chat-only.css` | Measured header/input transitions and 12px collapsed insets that animate away at edges with visible chrome |
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
| Collapsed pinned comment ellipsis | `banners.css` | Pinned text renderer's `[in-collapsed-banner] #content` truncation block |
| Gift announcement author and message | `core-theme.css` | `yt-gift-message-view-model` attributed-string wrappers; explicit semantic spans and artwork remain native |
| Buy Jewels title, neutral controls and responsive purchase layout | `monetization.css` | Engagement panel containing `pdp-view-model` |
| Jewels catalog title, neutral controls and unselected cards | `monetization.css` | Engagement panel containing `yt-pdg-gift-collection-view-model` |
| Product picker, legacy/revamped Super Chat, Super Sticker pack and preview | `monetization.css` | Each monetization renderer root |
| Live-chat donation amount picker | Native palette; selected purchase-page scrolling and purchase lifetime only | `ytd-donation-amount-picker-renderer[live-chat]` |
| Membership gift quantity offer | `monetization.css` | `ytd-sponsorships-gift-offer-renderer` and its header/body |
| Viewer poll card, question, choices and results | `banners.css` | Action panel containing `yt-live-chat-poll-renderer` |
| Answered / closed poll summary and results | `banners.css` | `yt-live-chat-banner-poll-renderer` and `yt-live-chat-banner-poll-choice`, including overflow-menu SVGs |
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

The Jewels catalog replaces the chat list with an engagement panel containing `yt-pdg-gift-collection-view-model`. Its title, back/information icons, and enabled unselected card surfaces/labels follow the profile. Selected send cards retain their native foreground/gradient pair; disabled cards, Jewels balance chips, token images and gift artwork are not recolored. Scope header rules to panels containing the collection or the Buy Jewels `pdp-view-model` so other engagement panels keep their own semantics. Buy Jewels shares one viewport-bounded outer content scroller for the options and its separate checkout footer, with the header kept outside. Release native 360px column minimums and nested 70vh/fit-content caps only within this panel; white price cards, blue checkout buttons, native labels, values and handlers remain intact. Pair an 8px scrollport inset with 8px margins on native focus targets so Tab reveals a partly clipped checkout button in Firefox as well as Chrome.

The participant-list header and back icon follow the profile rather than YouTube's fixed light header. Participant names keep the shared secondary/member colors, and owner chips retain their native paired foreground/background.

The purchase-preview header's current `#close` icon follows the primary color, and the Super Sticker preview's `#back-button` return-action surface uses the control tint. The colored purchase button and card, and the white sticker-pack backstory with its paired dark text, keep their native colors.

The attached iframe owns the chat size before any purchase menu opens. While the body carries `custom-yt-app-live-chat-extension`, `frame.css` releases `yt-live-chat-app`'s native minimum width and height; otherwise a small overlay can place the purchase entry below its viewport. Removing that body class restores the native minimums. The chat message scroller uses a thin scrollbar in the secondary text color, with a transparent track and contained vertical overscroll so reaching the chat's edge does not scroll the underlying page.

Native purchase menus stay in the borrowed chat iframe. While `ChatChromeLease` marks the body with `ylc-native-purchase-active`, only a selected `#buy-flow`, `#super-sticker-buy-flow`, or `#sponsorships-gift-buy-flow` makes `#panel-pages` scroll. The product picker is anchored inside the short input page: both the ordinary and restricted-participation input retain visible overflow while `[product-picker-open]` is set. While the picker is open, the input boundary is above the native chat header so a menu overlapping it remains reachable in a short viewport. The picker itself is bounded to the iframe viewport, with its own scrollbar. Picker and purchase-page scrollbars are thin, use the secondary text color over a transparent track, and contain overscroll. These rules do not force a hidden page to display, intercept an action, or change native values, disabled states, artwork, or payment buttons.

The overlay pauses its extension move and resize controls until the native purchase UI closes. This keeps the temporary purchase size from becoming a saved layout; YouTube's purchase controls remain available within their own scroll area.

Text links within ordinary chat messages and viewer-engagement message copy use `--extension-yt-live-link-color`, an opaque blue chosen against the configured background composited over black and white video extremes. Underlines distinguish links from surrounding text, and long URLs wrap inside the chat. Button-shaped anchors, paid-card foreground/background pairs, and outer payment pages keep native styling. At partial opacity the chosen blue maximizes the worse contrast of the two extremes; it does not promise a fixed contrast ratio for every possible color/opacity setting. With a fully transparent background, the link follows the configured text's light/dark direction: no single text color can guarantee contrast over every video frame.

The membership gift quantity offer uses the profile's panel tint, with transparent inner header/body fills. Theme its title, nested offer-section/quantity labels, description, close icon and unfilled quantity actions at their component boundaries: YouTube uses opaque native color tokens here, so overriding `--yt-spec-text-*` alone does not recolor the labels. Enabled Text quantity actions pair the configured foreground with a transparent resting background and the menu interaction tint on hover or visible keyboard focus. Preserve Filled, Tonal, disabled and ARIA-disabled button color pairs. These rules stay inside the offer renderer; external membership and payment dialogs keep YouTube's native palette.

The viewer poll floats above messages and uses the same minimum-96%-opacity surface as the support picker. Its question, metadata, choices and neutral controls follow the primary/secondary palette. Answered or closed polls use separate banner-poll components: theme their collapsed summary and expanded results as well as the overflow-menu SVGs, while retaining the banner's existing surface. Poll-local styles also tint the result bars; bar widths, selection markers, disabled attributes and voting behavior remain owned by YouTube. No poll-editor or other action-panel renderer is themed by these rules.

The ordinary purchase UI regression uses the separate typed `standardPurchaseInteractions` scenario. Its native-shaped pages cover legacy and revamped Super Chat inputs, validation and character limits, help, sticker pack selection/preview/return, membership quantities, the native membership offer, and live-chat donation amounts. The native input is the selected resting child of `#panel-pages`, not a second composer below a purchase page. Long terms and the native fixed sticker/gift scroll caps exercise small-view clipping. Real keyboard traversal only focuses purchase buttons; final actions remain unactivated.

Super Chat's `#revamped-price-input` is separate from `#price-input`; theme both actual input hosts, not every descendant of the price area. Its secondary metadata/disclaimer hosts and neutral links follow the profile while red validation and over-limit states remain native. The product-picker subtitle uses the secondary color independently of the title. Super Sticker's preview header and enabled pack-navigation icons use the neutral palette; arbitrary pack SVG artwork is excluded. Only active sticker/gift pages release inner fixed-height scroll areas, and gift section negative inline margins/header content-box overflow are corrected without changing quantities or handlers.

Live-chat donation cards retain their own native base-background/primary-text pair rather than the profile's neutral tint. Restore both on the card container because the shared action-panel token is deliberately transparent for ordinary chat. Suggested amounts wrap in a narrow card; error colors, native price buttons and the final Donate action remain unchanged. Non-chat donation dialogs are outside this override.
