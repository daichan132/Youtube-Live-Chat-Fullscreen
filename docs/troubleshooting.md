**English** · [日本語](translations/troubleshooting.ja.md) · [繁體中文](translations/troubleshooting.zh-TW.md)

# Troubleshooting

Start with the section that matches what you see. The [user guide](user-guide.md) covers normal operation; this page helps you check a problem and collect useful evidence if it continues.

## Check the basics

- Use the YouTube player's fullscreen button; theater mode and making the browser window fullscreen are different from player fullscreen.
- Open the extension's browser toolbar popup and confirm it is enabled.
- Use a live stream or an archive with playable chat replay. A regular video, disabled chat, or unavailable replay will not produce an overlay.

You do not need a separate extension account. Signing in to post live messages follows YouTube's usual rules.

## The chat switch does not appear

The switch at the bottom right of the player only appears when YouTube provides a chat for the current video:

1. Open a live stream, or an archived stream that has chat replay. Regular videos have no chat, so the switch stays hidden.
2. Enter fullscreen. The switch renders inside the fullscreen player controls.
3. If the video has chat and the extension is enabled but the switch is still missing, leave fullscreen, reload the page once, then enter fullscreen again.

## The switch appears but the chat stays empty

Archive replay can briefly be pending before it is playable. Leave fullscreen and check whether YouTube's own chat replay loads for the video, then enter fullscreen again.

If YouTube's chat is usable but the overlay remains empty, report it with the video type and reproduction steps described below. An available native chat and an empty overlay are different from a video with no chat.

## Opera: the switch or chat is missing

1. Open `opera://extensions`.
2. Confirm the extension is enabled and has access to `youtube.com`.
3. Reload a live stream or an archive with chat replay, then enter fullscreen.

The switch only appears when chat is available for the video, same as on Chrome.

## The overlay looks wrong or stops responding

1. Leave fullscreen and check whether YouTube's own chat works.
2. Reload the YouTube page once, then enter fullscreen again and check the overlay.
3. If the problem persists, submit a [bug report](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml) with the steps you tried and whether reloading changed the behavior.

## The overlay moved on its own

Before you place the panel manually, automatic placement can move it away from captions, player controls, an open menu, or the end screen. Dragging, resizing, or using the placement buttons switches off automatic placement for the saved layout. The panel still adjusts to fit the player when its size changes.

## Send a useful bug report

Search [existing reports](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues), then use the [bug report form](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml) if the problem is not already covered. Include:

- Browser, operating system, and extension versions.
- Live stream, archive replay, or video without chat; also note direct live or channel live entry if relevant.
- Steps from opening the video to the failure, and what you expected to happen.
- Whether reloading changed the behavior, and a screenshot or recording with personal information removed.

Share a public video link only when it is safe to do so. Report security vulnerabilities privately through [SECURITY.md](../SECURITY.md).

---

[Back to the user guide](user-guide.md) · [Back to the README](../README.md)
