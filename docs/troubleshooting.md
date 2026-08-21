# Troubleshooting

Quick fixes for the most common problems. If none of these help, please [report a bug](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml).

## The chat switch does not appear

The switch at the bottom right of the player only appears when YouTube provides a chat for the current video:

1. Open a live stream, or an archived stream that has chat replay. Regular videos have no chat, so the switch stays hidden.
2. Enter fullscreen. The switch renders inside the fullscreen player controls.
3. If the video has chat but the switch is still missing, reload the page once — YouTube sometimes swaps the player without a full page load.

## Opera: the switch or chat is missing

1. Open `opera://extensions`.
2. Confirm the extension is enabled and has access to `youtube.com`.
3. Reload a live stream or an archive with chat replay, then enter fullscreen.

The switch only appears when chat is available for the video, same as on Chrome.

## The overlay looks wrong or stops responding

1. Open the overlay settings (gear icon) and use the restart control to restart the chat runtime.
2. If the problem persists, copy the sanitized diagnostic report from the settings panel and attach it to a [bug report](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml). The report is sanitized before it is copied.

## Still stuck?

- Search existing reports: https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues
- File a new bug with the template: https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml
