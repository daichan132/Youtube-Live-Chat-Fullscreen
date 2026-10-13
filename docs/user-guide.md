# Watching with fullscreen chat

YouTube Live Chat Fullscreen places YouTube's chat over the video. This guide covers the everyday controls; installation links and an example layout are in the [README](../README.md).

## Open the overlay

1. Install the extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd) or [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/).
2. Open a live stream, or an archived stream with playable chat replay.
3. Enter fullscreen using the YouTube player's fullscreen button. Chat is enabled by default; the chat button in the player controls turns it off or on.

Use the browser toolbar popup to enable the extension again if it was turned off. The popup also offers light, dark, and system themes and an interface-language selector.

YouTube still owns the chat. Sign-in and live-message posting follow YouTube's usual rules; the extension does not require a separate account. Archive chat is a replay of the original conversation.

## Put the panel where it fits

Hover the panel to reveal its controls. Drag the panel's move handle to reposition it, and drag an edge or corner to resize it. A narrow panel can leave more room for the action; a wider panel gives longer messages room to wrap.

The placement controls also offer buttons to move the panel or change its width and height in small steps. Focus the panel's control row to use these buttons with a keyboard.

The saved layout is relative to the player, so it can adapt to a different fullscreen size. Automatic placement can also move a panel away from captions or player controls. A manual layout change takes priority over automatic placement.

## Choose a reading style

Open settings from the panel's control row. Appearance controls include:

| Setting | Use it to |
| --- | --- |
| Text size and font | Read comfortably at your viewing distance |
| Text and member-name colors | Keep messages legible against the background |
| Background color, opacity, and blur | Separate chat from a busy video frame |
| Message spacing | Give messages more breathing room |
| Username and avatar visibility | Simplify ordinary messages; paid-message identity remains visible |
| Show when idle | Keep chat visible after the player controls fade |
| Messages-only mode | Fold the chat header and input away until you hover |

Messages-only mode is available when chat is set to stay visible while idle. Reduce blur if the overlay feels sluggish on an older machine.

The settings controls have accessible labels and support keyboard interaction. Dragging and resizing from the panel edges use a pointer; the placement buttons offer an alternative.

## Save a preset

Open the preset tab and use **Apply** on the style you want. To create one, select **Save Current Settings**, then edit the new preset's name from **Untitled** to something recognizable. Presets are useful for keeping a compact game layout and a more spacious reading style ready to switch between.

Presets store appearance. The panel's position and size are saved separately, so choosing another preset does not move it.

## Back up or move settings

Open the browser toolbar popup to export settings as a JSON file. To transfer them to another browser or profile, choose the file in its import control, review the preview, then select **Apply**.

The backup includes extension enablement, theme, appearance, named presets, and panel geometry. Interface language stays a browser-local preference and is not included. Settings are stored locally; this is not automatic account-based synchronization.

Import replaces the backed-up settings, so export a copy first if you want to keep the current setup.

## When chat is unavailable

Regular videos and streams without usable chat do not show the fullscreen overlay. Archive support requires YouTube's chat replay to be available and playable. The extension cannot add a conversation that YouTube does not provide.

If a usable chat exists but the panel is missing, or the layout stops responding, follow [troubleshooting](troubleshooting.md). The settings panel can reload the overlay and copy a sanitized diagnostic report for a bug report.

## Privacy

Settings remain in this browser. The extension has no analytics or tracking service and does not send chat content or viewing activity to the developer. YouTube's chat uses YouTube's own services, and optional fonts may be loaded from Google Fonts.

[Back to the README](../README.md) · [Browse the documentation](README.md)
