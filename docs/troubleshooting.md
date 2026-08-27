# Troubleshooting

Quick fixes for the most common problems. If none of these help, please [report a bug](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml).

## The chat switch does not appear

The switch at the bottom right of the player only appears when YouTube provides a chat for the current video:

1. Open a live stream, or an archived stream that has chat replay. Regular videos have no chat, so the switch stays hidden.
2. Enter fullscreen. The switch renders inside the fullscreen player controls.
3. If the video has chat but the switch is still missing, reload the page once — YouTube sometimes swaps the player without a full page load.

## The switch appears but the chat stays empty

This is a real state, not a broken one. When an archive's chat panel exists but its replay is not yet playable, the switch can be visible before the overlay can mount. Give it a few seconds, or reload the page once.

If it never fills in, that is worth reporting — include the video type and the diagnostic report described below.

## Opera: the switch or chat is missing

1. Open `opera://extensions`.
2. Confirm the extension is enabled and has access to `youtube.com`.
3. Reload a live stream or an archive with chat replay, then enter fullscreen.

The switch only appears when chat is available for the video, same as on Chrome.

## The overlay looks wrong or stops responding

1. Hover the chat panel to bring up its control row, open the settings with the sliders button, then press Reload chat overlay under the Compatibility heading. It rebuilds the chat session on the page; it does not restart the extension.
2. If the problem persists, press Copy diagnostic report beside it and attach the sanitized report to a [bug report](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml).

The report is sanitized before it reaches your clipboard: it contains no URLs, video IDs, chat text, or user names. It carries which page elements were found, a short code such as `IFRAME_DOCUMENT_NOT_READY` describing where the runtime stopped, and a compatibility fingerprint. Those codes are what make a report actionable, so it is worth including even if it looks opaque.

## The overlay moved on its own

The overlay repositions itself at most once per video, to get out from under captions, player controls, an open menu, or the end screen. Once you drag or resize it yourself, it stays where you put it and automatic placement is switched off for that layout.

## Still stuck?

- Search existing reports: https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues
- File a new bug with the template: https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml

---

*Maintainer note: this page is the designated support destination for the extension. The store listing check rejects browser-specific instructions such as `opera://` URLs inside the 55 listing manuscripts and expects those steps to live here instead, so the Opera section above is deliberate — do not move it back into a listing.*
