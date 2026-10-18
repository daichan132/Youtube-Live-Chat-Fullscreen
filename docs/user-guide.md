**English** · [日本語](translations/user-guide.ja.md) · [繁體中文](translations/user-guide.zh-TW.md)

# Watching with fullscreen chat

YouTube Live Chat Fullscreen places YouTube's chat over the video. This guide covers the everyday controls; installation links and an example layout are in the [README](../README.md).

## Open the overlay

1. Install the extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd) or [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/).
2. Open a live stream, or an archived stream with playable chat replay.
3. Enter fullscreen using the YouTube player's fullscreen button. Chat is enabled by default; the chat button in the player controls turns it off or on.

Use the browser toolbar popup to enable the extension again if it was turned off. The popup also offers light, dark, and system themes and an interface-language selector.

YouTube still owns the chat. Sign-in and live-message posting follow YouTube's usual rules; the extension does not require a separate account. Archive chat is a replay of the original conversation.

![Fullscreen live chat with a native message input and blurred viewer identities](store-assets/chrome-web-store/source/captures/default-chat.png)

*Default chat with a visible native input and an unsent draft. Viewer identities are blurred in this screenshot. Footage: Kazama Iroha / hololive. [Sources and privacy](store-assets/chrome-web-store/README.md#sources-and-privacy).*

## Put the panel where it fits

Hover the panel to reveal its controls. Drag the dotted move handle to reposition it, and drag an edge or corner to resize it. A narrow panel can leave more room for the action; a wider panel gives longer messages room to wrap.

Select **Adjust position and size**, the horizontal-arrows button, to move the panel or change its width and height in small steps. You can also reach the control row with Tab and use these buttons with a keyboard.

The saved layout is relative to the player, so it can adapt to a different fullscreen size. Automatic placement can also move a panel away from captions or player controls. A manual layout change takes priority over automatic placement.

## Choose a reading style

Select **Open settings**, the sliders button in the panel's control row, to change the reading style.

Appearance and placement changes are saved automatically when you finish an adjustment.

| Setting | Use it to |
| --- | --- |
| Text size and font | Read comfortably at your viewing distance |
| Text and member-name colors | Keep messages legible against the background |
| Background color, opacity, and blur | Separate chat from a busy video frame |
| Message spacing | Give messages more breathing room |
| Username and avatar visibility | Simplify ordinary messages; paid-message identity remains visible |
| Show When Idle | Keep chat visible after the player controls fade |
| Chat-Only Mode | Fold the chat header and input away until you hover |

For a fully transparent background like the README example, open **Background Color**, move its bottom transparency slider all the way left (0%), and set **Blur** to **0**. For the messages-only layout, turn on **Show When Idle**, then **Chat-Only Mode**. Leave Chat-Only Mode off if you want the message input to stay visible. Reduce blur if the overlay feels sluggish on an older machine.

The settings controls have accessible labels and support keyboard interaction. Dragging and resizing from the panel edges use a pointer; the placement buttons offer an alternative.

## Save a preset

Open the **Presets** tab and use **Apply** on the style you want. These built-in styles are useful starting points.

- **Transparent** uses a semi-transparent background with blur.
- **Large Text** uses larger text and a light background.
- **Chat Only** hides ordinary-message names and avatars and folds away the header and input until you hover.

To keep a named copy of your current style, select **Save Current Settings**, then edit the new preset's name from **Untitled** to something recognizable. You can keep a compact game layout and a more spacious reading style ready to switch between.

Presets store appearance and display options, including idle visibility and messages-only mode. The panel's position and size are saved separately, so choosing another preset does not move it.

## Back up or move settings

Open the browser toolbar popup to export settings as a JSON file. To transfer them to another browser or profile, choose the file in its import control, review the preview, then select **Apply**.

The backup includes extension enablement, theme, appearance, named presets, and panel geometry. Interface language stays a browser-local preference and is not included. Settings are stored locally; this is not automatic account-based synchronization.

Import replaces the backed-up settings, so export a copy first if you want to keep the current setup.

## When chat is unavailable

Regular videos and streams without usable chat do not show the fullscreen overlay. Archive support requires YouTube's chat replay to be available and playable. The extension cannot add a conversation that YouTube does not provide.

If a usable chat exists but the panel is missing, or the layout stops responding, follow [troubleshooting](troubleshooting.md).

## Privacy

Settings remain in this browser. The extension has no analytics or tracking service and does not send chat content or viewing activity to the developer. YouTube's chat uses YouTube's own services, and optional fonts may be loaded from Google Fonts.

[Back to the README](../README.md) · [Browse the documentation](README.md)
