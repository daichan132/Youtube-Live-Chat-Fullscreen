<p align="center">
  <img src="docs/store-assets/chrome-web-store/screenshots/01-introduction.png" alt="Illustrated introduction to YouTube Live Chat Fullscreen — Fullscreen. Live Chat." width="1000" />
</p>

<p align="center">
  <strong>Watch the stream. Be part of the conversation.</strong><br />
  YouTube's own chat, right over your fullscreen video.
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd"><img src="https://img.shields.io/badge/Add_to_Chrome-4285F4?style=for-the-badge&amp;logo=googlechrome&amp;logoColor=white" alt="Install on Chrome" /></a>
  <a href="https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/"><img src="https://img.shields.io/badge/Get_for_Firefox-FF7139?style=for-the-badge&amp;logo=firefoxbrowser&amp;logoColor=white" alt="Install on Firefox" /></a>
</p>

<p align="center">
  Live &amp; replay · 55 interface locales · Free &amp; open source<br />
  <a href="docs/user-guide.md">User guide</a> · <a href="docs/translations/README.ja.md">日本語</a> · <a href="docs/translations/README.zh-TW.md">繁體中文</a>
</p>

## Pick your view

### Live chat, ready to join

[![Kazama Iroha's fullscreen live stream with native chat and an unsent draft; viewer identities are blurred](docs/store-assets/chrome-web-store/source/captures/default-chat.png)](docs/store-assets/chrome-web-store/source/captures/default-chat.png)

Read and reply with YouTube's native input. The draft shown above was not sent.

<p>
  <a href="docs/store-assets/chrome-web-store/source/captures/transparent-chat.png"><img src="docs/store-assets/chrome-web-store/source/captures/transparent-chat.png" alt="CohhCarnage archive with fully transparent, messages-only chat and protected viewer identities" width="49%" /></a>
  <a href="docs/store-assets/chrome-web-store/source/captures/custom-style.png"><img src="docs/store-assets/chrome-web-store/source/captures/custom-style.png" alt="DrLupo archive with navy chat, Inter font, background blur and protected viewer identities" width="49%" /></a>
</p>

**Transparent** — keep the video in view. **Custom** — choose your colors and font.<br />
Both are messages-only replay examples, without a message input. Open any image for the full-resolution view.

<sub>Footage: Kazama Iroha / hololive, CohhCarnage, DrLupo. Viewer identities are blurred or hidden. <a href="docs/store-assets/chrome-web-store/README.md#sources-and-privacy">Sources and privacy</a>.</sub>

## Make it yours

- **Move & resize** — put chat where it fits the game or performer.
- **Color, opacity & blur** — adjust the background, text and message spacing.
- **Save your style** — keep named presets and export settings for backup or another browser.

Light, dark and system themes, plus right-to-left layouts. [Explore the controls →](docs/user-guide.md)

## Start in 3 steps

1. **Install** from Chrome Web Store or Firefox Add-ons using the buttons above.
2. **Go fullscreen** on a YouTube live stream or an archive with playable chat replay.
3. **Make room for chat.** Hover the panel to move, resize or open its settings.

Chat is enabled by default. The player's chat button toggles it.<br />
[Need a hand?](docs/troubleshooting.md) · [Presets & backups](docs/user-guide.md)

<details>
<summary><strong>Chat, browser support & privacy</strong></summary>

The overlay uses YouTube's own chat. Sign-in, posting, badges and Super Chat follow YouTube's rules and the channel's participation settings. Archive chat replays the original conversation.

This extension is for desktop browsers. The Chrome build also runs in Opera. Videos without usable chat keep the normal fullscreen player.

There is no extension account, analytics SDK or tracking service. Settings stay in this browser's `browser.storage.local`; viewing activity and chat content are not sent to the developer. YouTube's own chat continues to communicate with YouTube. Optional font selections may fetch fonts from Google Fonts.

The production manifest requests only `storage`, with content scripts and public extension resources scoped to YouTube. See the [package policy](config/packagePolicy.ts) and [package checks](scripts/verify/check-package-contracts.mjs).

</details>

<details>
<summary><strong>Explore the engineering</strong></summary>

Built with WXT, React, TypeScript, Jotai and Tailwind CSS for Chrome and Firefox.

- [Content runtime](docs/architecture/content-runtime.md): follow YouTube navigation and restore the borrowed native chat iframe.
- [Settings and state](docs/architecture/settings-and-state.md): preview edits while keeping drafts, saved settings and other extension windows in order.
- [Browser tests](docs/testing/contracts.md): deterministic live, replay and no-chat fixtures, with real-site compatibility checked separately.

Start with the [engineering overview](docs/engineering.md) or [choose a contribution](CONTRIBUTING.md#choose-a-starting-point).

</details>

## Help shape the extension

[Report a bug](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml) · [Suggest a feature](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=feature.yml) · [Improve a translation or guide](CONTRIBUTING.md)

<sub>Private vulnerability reports: <a href="SECURITY.md">SECURITY.md</a> · Licensed under <a href="LICENSE">GPL-3.0</a>.</sub>
