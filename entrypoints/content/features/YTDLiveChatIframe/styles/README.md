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

## Guardrails

- Keep the import order stable unless a computed-style comparison proves that changing the cascade is safe.
- Do not use CSS `@import`; the final string is installed in the iframe document and must be self-contained.
- Do not add cascade layers without measuring them against YouTube's unlayered author styles.
- Keep direct `display: none` limited to YouTube's native close control. Hiding an iframe or its ancestor this way can throttle chat updates.
- Blur does not belong in these modules. It is applied to the iframe document `body` by `changeYLCBlur()` so chat text remains sharp.
- Keep the expanded chat header above the ticker and its overflow visible because YouTube mounts the chat mode dropdown inside a transformed header stacking context. Clip the header only in `chat-only-display`.
- Add a rule to the narrowest responsible module and preserve the `custom-yt-app-live-chat-extension` scope.
