# iframe styles

These styles are injected into YouTube's live chat iframe document. The module order in `index.ts` is part of the cascade contract.

| Module | Responsibility |
|---|---|
| `tokens.css` | Extension CSS variable defaults |
| `frame.css` | Transparent iframe surfaces and native chrome trimming |
| `core-theme.css` | Shared text, icon, button, and control colors |
| `menus.css` | Dropdown and overflow menu surfaces |
| `banners.css` | Pinned banners and message action colors |
| `leaderboard.css` | Top fans / live viewer leaderboard |
| `composer.css` | Input, restricted state, emoji picker, and reactions |
| `chat-only.css` | Measured header/input collapse transitions |
| `monetization.css` | Super Chat, Super Sticker, and product picker flows |
| `message-layout.css` | Message typography, spacing, author/avatar, and display toggles |

## Surface coverage

Keep stateful surfaces on the component boundary that replaces the chat list. The shared frame and message list stay transparent, and body transparency is owned by `frame.css` — a borrowed iframe must not gain an inline background that then needs restoring. Blur is applied in two places: the React background layer behind the iframe samples the parent-page video, and the iframe body carries its own `backdrop-filter` so surfaces inside the document blur what is behind them. Menu, composer, and monetization surfaces use a low-alpha tint derived from the configured background color so stacked surfaces do not become nearly opaque, and apply the configured blur to their own outer backdrop. The monetization loading panel clears only YouTube's opaque fill; the React background continues to own the configured color and opacity.

| UI state | Surface owner | Boundary |
|---|---|---|
| Signed-in input, restricted input, legacy sign-in prompt, current signed-out prompt | `composer.css` | Direct child of `#input-panel` |
| Emoji picker search control | `composer.css` | `yt-emoji-picker-renderer #search-panel` |
| Chat mode, header overflow, and message action menus | `menus.css` | YouTube dropdown / popup outer surface |
| Product picker, Super Chat, Super Sticker pack and preview | `monetization.css` | Each monetization renderer root |
| Top fans / XP panel | `leaderboard.css` | `PAlive_viewer_leaderboard` engagement panel |

Do not theme `yt-live-chat-message-renderer` globally. YouTube also uses it for regular chat content; the signed-out prompt is identified only as its direct `#input-panel` child.

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
