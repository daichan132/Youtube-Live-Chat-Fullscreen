# Store asset work list

> **Text side is stale relative to the dashboard.** All 55 listing manuscripts were rewritten on 2026-08-22, after the `chrome-dashboard-snapshot-2026-08-19.json` this file anchors to. `yarn store:check --snapshot` therefore reports drift on essentially every locale's description. That comparison is informational and does not fail `yarn check`; the fix is to apply the copy in the Chrome dashboard and then refresh the snapshot. The *asset* facts below are still current.
>
> **There is an unevaluated asset library.** [`../store-assets/concepts/`](../store-assets/concepts/) holds 100 finished 1280×800 compositions with Japanese copy — including the ja localization this file treats as blocked. They are marketing illustrations whose chat panel is a mockup rather than the real overlay, so they do not satisfy the screenshot slots below, but they are a plausible source for the promo tiles. Decide and record which, rather than planning around them again.

Status as of 2026-08-19: the dashboard has 3 global screenshots, no localized screenshots, no promo video, and no promo tiles. `yarn capture:store-assets` reproduces five raw captures into `screenshots/` (`fullscreen-chat-overview`, `settings-setting-light`, `settings-setting-dark` at 2560x1440 and `popup-light`/`popup-dark` at 900x798). The Chrome Web Store accepts screenshots at 1280x800 or 640x400, a small promo tile at 440x280, and a marquee promo tile at 1400x560 (https://developer.chrome.com/docs/webstore/cws-dashboard-listing).

## What the current 3 screenshots do not show

- Posting: no capture shows the comment input or a Super Chat, which is the extension's main differentiator. The capture pipeline uses a paused archive with `messages-only` chrome, so the input field is deliberately hidden.
- Repositioning: static captures cannot show dragging; a corner-anchored "before/after" pair or a short promo video is needed.
- Presets: the preset panel is never opened in the capture flow.

## Proposed screenshot set (5 slots, 1280x800)

1. Fullscreen overview (exists — recrop from 2560x1440; 16:9 source needs a 16:10 crop decision).
2. Settings panel open, light theme (exists — same recrop decision).
3. Chat with the input field visible, mid-post. New capture: `idleVisibility: 'always-visible'` with input chrome shown; needs a new spec step.
4. Preset panel open showing the bundled presets. New capture: open the preset tab in the settings panel.
5. Dark theme overview (exists as `settings-setting-dark`).

Recropping 2560x1440 to 1280x800 is a composition decision (crop vs letterbox); do not automate it silently.

## Localized screenshots

The capture project is hard-coded to English UI (`getByLabel('Select language')` and theme label regexes) and sets no `locale`; localizing requires parameterizing the store-assets Playwright project by locale and seeding the extension language. Highest-value locales by audience size for YouTube live culture and existing localized titles: ja, ko, zh_TW, zh_CN, es, pt_BR, ru. Recommended first pass: ja only (the title and summary are already fully localized and Japanese live-stream viewers are a core audience), then evaluate downloads before widening.

## Promo tiles (manual design work)

- Small promo tile 440x280: required for most discovery placements. Composition: product name + one-line hook ("Fullscreen. Chat stays.") over a darkened fullscreen still with the overlay visible. Keep text within ~90% safe area; export PNG.
- Marquee promo tile 1400x560: optional; only worth producing after the small tile. Same visual language, wider crop of the fullscreen still, name left, overlay right.
- Copy for both should reuse the listing hook, not introduce new claims.

## Promo video

Optional. A 20-30 second screen recording would show the three things static screenshots cannot: toggling the switch, dragging/resizing, and posting. Needs manual recording and editing; YouTube-hosted, any language with English captions. Not reproducible by the current automated flow.
