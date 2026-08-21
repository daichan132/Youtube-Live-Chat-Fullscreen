Go full screen on a YouTube live stream and the chat disappears.

This extension puts it back over the video, so you can read every message, reply, and send Super Chats on a live stream — without ever leaving full screen. It starts as a solid white panel with black text; colour, transparency and text size are yours to change.

No shrinking the player, no theatre mode, no popped-out window on a second monitor — the conversation is simply there, and one button in the control bar turns it off and on. Free, open source, desktop browsers only.

NOT A LOOKALIKE — YOUTUBE'S OWN CHAT, ON THE VIDEO
The panel over the video is YouTube's own live chat, the one from the sidebar. Member badges, emoji, stickers, the message box, the Super Chat and Super Sticker purchase panel — all of it YouTube's own. Posting goes through that box, so you must be signed in, as always. Scrolling back and members-only chat work as they do beside the player. The extension does not rebuild the messages; what it changes is largely the look: colours, sizes, spacing.

A CONCERT ON THE BIG SCREEN
Push the text up to 40px and put the panel in a corner. Show when idle is on from the start, so messages stay up after the player controls fade.

A GAMING STREAM ON THE SECOND MONITOR
Chat-only mode folds away the header and message box until you hover, leaving a clean column of messages; it is in the settings panel only when Show when idle is on. Resize the panel into a narrow ribbon down one edge and add a little blur: readable over bright gameplay without blocking the view.

CATCHING UP ON AN ARCHIVE AFTER MIDNIGHT
Open a past stream that still has chat replay, go full screen, and it is back in the panel and style you tuned. Skip around or change the speed and the chat keeps up, as in the sidebar — same comments, nothing added, nothing hidden.

A LOOK FOR EVERY KIND OF STREAM
Seven presets are built in. Pick Large text — 18px black type on an almost-solid white panel, no user names or profile pictures — and the chat reads from the sofa. Save your own, then rename, reorder or delete them.

WHAT YOU CAN CONTROL
Position: drag the panel anywhere over the player. Hover over it for a control row — settings button and drag handle — just below, bottom right (near the bottom of the screen it rides up over the panel). With the row up, Tab to the handle and arrow keys nudge it 10px at a time. It starts in a corner and hops once to the least-covered one when subtitles, menus, the end screen or the control bar start to cover it. Place it yourself and it stays put.
Size: it opens at about a third of the player's width and just over half its height; drag any edge or corner to make it a narrow ribbon or a tall column. Position and size scale with the player, so a laptop layout fits a 32-inch monitor.
Background: colour and opacity from one picker, plus 0-20px blur for a frosted look over busy footage. Blur starts at 0 — the one setting that can slow an older machine, so leave it at 0 there.
Text: 10px to 40px, 13px by default — 40px is about three times the size of normal chat text. Resizing the panel never changes the size you picked. Set the text colour, a separate one for member names, and one of 50 fonts, Japanese faces included; each applies as you pick it.
Spacing: 0-40px between messages, plus switches for the Super Chat ticker bar and for user names and profile pictures on ordinary messages (paid ones keep theirs).
Visibility: keep the panel up while you sit still, or let it fade a second after the mouse and keyboard go quiet, back at your next move.
Undo: with the settings panel open, Cmd/Ctrl+Z steps back through appearance changes and Shift+Cmd/Ctrl+Z redoes them, up to 50 steps — not position or size.
Theme: light, dark or auto for the extension's panels, from the toolbar popup.
Language: the extension's own, in the same popup, independent of your browser's — 55 options across 49 languages, regional variants for English, Spanish, Portuguese and Chinese, and right-to-left layout for Arabic, Hebrew and Persian.

ONE PRESS AND YOUTUBE IS BACK TO NORMAL
Press YouTube's own chat button and the overlay switches off, leaving the page as it was; the player button and the toolbar icon turn it back on. Clicks and scrolling inside the panel stay in the chat, so you won't pause or scrub the video by mistake; outside it the player behaves as always.

WHAT IT COSTS, WHAT IT COLLECTS
Free — no account, no paid tier.
Two permissions: activeTab and storage. The code runs in one web page only, www.youtube.com — that is all Chrome's install prompt means when it mentions reading and changing your data. Nothing runs in the background either: with no YouTube tab open, only an open popup does anything. All the code ships inside the extension, and the only thing ever fetched is a font. The default font loads nothing; any other, or a preset using one, comes from Google Fonts.
No analytics, no tracking, nothing sent to the developer: what you read and type is never collected, stored or sent anywhere. Super Chat payments go through YouTube's purchase panel, not the extension; the one control it changes there is Membership, which opens the channel's join page in a new tab. Settings stay in this browser on this computer, never synced through your Google account; the popup exports them to a file to import elsewhere.
Open source under GPL-3.0: the full code is public on GitHub, so you can check every claim here.

HOW TO START
1. Install it, then open a live stream or an archive with replay.
2. Put the player in full screen.
3. The chat is back over the video — nothing to switch on.
4. A new speech-bubble button in the control bar, bottom right, turns it off and on; the panel's settings button changes the look. Both carry over to the next stream.

The panel appears only in full screen, only on a watch page with chat — on an ordinary video, or a stream whose replay is gone, the button never shows. In windowed and theatre mode the chat is already beside the player. This Chrome build also runs in Opera and other Chromium browsers; Firefox has its own build on addons.mozilla.org.

KEYBOARD ACCESS AND TROUBLESHOOTING
Every setting is labelled for a screen reader, and sliders and pickers take arrow keys; only resizing and the control row, which appears on hover, need a mouse. Messages are YouTube's own, so a screen reader reads them as it does the sidebar. Automated WCAG 2.1 AA checks run on every code change, covering the popup, control row and settings panel.
YouTube reworks its player often; the extension has kept up since 2023. If something does break, the settings panel has a status readout, a restart button and a one-click diagnostic report. The report lists the extension's version, your browser and where the overlay could and could not attach — no video, channel or personal information — and goes only to your clipboard.

Report a bug or request a feature: https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues
Source code: https://github.com/daichan132/Youtube-Live-Chat-Fullscreen
Support the developer: https://ko-fi.com/daichan132
