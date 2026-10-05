# Included chat CSS presets

These are extension-owned **starter CSS sources**, not appearance presets or
user registrations. They are read with explicit `?raw` imports by
`../chatCssPresets.ts`. Never import a preset CSS file as a stylesheet in the
settings UI, run it in a preview, or insert it into storage at startup.

| File | Purpose | Preserves |
| --- | --- | --- |
| `messenger.css` | Round avatars and conversation bubbles; name above body | Name/icon visibility, author/badge/link colors and replay timestamps |
| `stage.css` | A name-and-badge header above a card body | Semantic colors, name/icon visibility and natural message height |
| `timeline.css` | Avatar beside a vertical content line and row separators | Avatar-free rows, replay timestamps, links and emoji |
| `bubbles.css` | Soft round backgrounds | Configured text color and size |
| `cards.css` | Fine border and subtle shadow | Author and message colors |
| `outline.css` | White message text with a dark outline | Author/badge/link colors; panel background unchanged |
| `compact.css` | Small vertical gaps | Names, avatars, wrapping and controls |
| `comfortable.css` | At least 16px text and generous spacing | Larger configured text sizes |
| `accent.css` | A colored stripe | Author, role and badge colors |

## Adding or changing a preset

1. Add one ordinary `.css` source here. Give tunable values brief comments.
2. Add an explicit raw import and one entry to `../chatCssPresets.ts` with a
   unique, stable ID and typed title/description translation keys. Use `noteKey`
   only for a relevant prerequisite such as adjusting the panel background.
3. Add the keys in `shared/i18n/assets/*.json`, then run
   `node scripts/generate-locales.mjs` and `yarn locales:check`. Do not hand-edit
   `public/locales/`, `public/_locales/` or `shared/i18n/generated/`.
4. Review the selectors and validate the preset in a real live and replay chat,
   in both browser families and with light/dark appearance settings. Update the
   catalog selector fixture when a real YouTube structural change requires it.

No remote URLs/imports/fonts, animations, per-message JavaScript, DOM rewrites,
fixed row heights, clipping, or rules that hide controls belong in these
packaged presets. Do not recolor author names or badges: their semantics matter.
Target normal message-list renderers, not paid messages, deleted messages,
pinned banners, menus or the composer. Do not use global `html`, `body`, `*`,
page-wide `#message`, or `#author-name` rules. The selectors include the
extension's existing body scope. These files do not style an unmodified
YouTube/OBS page without that scope; they are presets for this extension.

The three layout presets target direct, undeleted text-message children of the
item list. With YouTube's `#author-photo` + `#content` structure, they use a flex
row and stack the existing timestamp, author chip and message inside the content.
They leave the name/icon display properties alone, so hiding an avatar does not
leave a reserved grid column. `:has(> #content)` selects this layout; a renderer
without that wrapper receives a simpler frame with a block message and a floated
avatar. Neither path fixes the row height or clips overflowing content. Author
chips, timestamps, links, emoji and menu buttons keep their native content and
semantic colors. The header card styles the author chip's box, not its name or
badge colors.

Each source is self-contained and replaces the previous active CSS through the
normal Apply operation. It is not concatenated with another preset. Loading a
preset copies text into the editor; it does not apply it or use a registration
slot. Editing/applying/registering a copy never mutates the packaged catalog.
Once applied or registered, the copy does not silently follow future catalog
updates. Reloading the original is an explicit, guarded editor operation.

The source, selector and computed-style tests are regression aids, not an
arbitrary-CSS sanitizer or proof of real-browser compatibility. Run the focused
catalog tests when changing these sources and `yarn verify` for the final code
gate. Layout acceptance also requires a real browser with live and replay chat,
light/dark colors, long messages, links, emoji, and hidden names/avatars. Follow
`docs/maintainers/verification-browser.md` for browser verification; packaging
contracts remain a separate gate.
