<div align="center">
  <img src="public/icon/128.png" alt="YouTube Live Chat Fullscreen logo" width="80" />
</div>

<h1 align="center">YouTube Live Chat Fullscreen</h1>

<p align="center">
  <strong>Watch in fullscreen. Keep the chat.</strong><br />
  Bring YouTube's live chat onto the video, with a panel you can move, resize, and make your own.
</p>

<p align="center">
  Chrome &amp; Firefox · Live &amp; replay · 55 interface locales · Free &amp; open source
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd"><strong>Install on Chrome</strong></a>
  ·
  <a href="https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/"><strong>Install on Firefox</strong></a>
  ·
  <a href="docs/user-guide.md">User guide</a>
  ·
  <a href="docs/translations/README.ja.md">日本語</a>
  ·
  <a href="docs/translations/README.zh-TW.md">繁體中文</a>
</p>

![A fullscreen YouTube stream with a compact chat overlay in the upper-right corner](.github/screenshots/fullscreen-chat-overview.png)

*An example layout with a transparent background and hidden usernames. Choose the colors, text size, and position that suit the stream.*

## Keep up with the conversation

Watch a concert, follow a game, or catch up on an archived stream while keeping the chat reactions in view. The overlay uses YouTube's own chat, so live-chat sign-in, posting, badges, and Super Chat remain handled by YouTube.

| Make room for the video | Make the chat comfortable |
| --- | --- |
| Drag the panel to a quieter part of the frame | Adjust text size, fonts, colors, and message spacing |
| Resize it from an edge or corner | Choose background transparency and blur |
| Keep messages visible while player controls fade | Hide ordinary-message usernames and avatars |
| Use messages-only mode for a compact layout | Save named presets and switch between styles |

Light, dark, and system themes are available, along with 55 interface locales and right-to-left layouts. Export your settings as JSON to back them up or move them to another browser.

## Start watching

1. Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd) or [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/).
2. Open a YouTube live stream or an archive with playable chat replay, then enter fullscreen. Chat is enabled by default.
3. Hover the panel to open its controls. Drag to move it, resize from its edges, or open settings to change the appearance. The chat button in the player controls toggles visibility.

The extension is for desktop browsers. The Chrome build also runs in Opera. Videos without usable chat keep the normal fullscreen player without an overlay.

See the [user guide](docs/user-guide.md) for presets and backups, or [troubleshooting](docs/troubleshooting.md) if the panel does not appear.

## Privacy you can inspect

There is no extension account, analytics SDK, or tracking service. Settings stay in this browser's `browser.storage.local`; the extension does not send viewing activity or chat content to the developer. YouTube's own chat continues to communicate with YouTube.

The production manifest requests only `storage`, and content scripts and public extension resources are scoped to YouTube. Optional font selections may fetch fonts from Google Fonts. The [package policy](config/packagePolicy.ts) and [package checks](scripts/verify/check-package-contracts.mjs) make these boundaries visible in the source.

## Explore the code

This is a WXT, React, TypeScript, Jotai, and Tailwind CSS project with one codebase for Chrome and Firefox. The interesting work is keeping a fullscreen overlay reliable on a page that changes underneath it:

- **YouTube lifecycle:** SPA navigation, player replacement, live/replay transitions, and restoration of borrowed chat iframes.
- **Settings across extension contexts:** popup, overlay, and settings page share persisted preferences without unrelated edits overwriting one another.
- **Browser evidence:** deterministic YouTube fixtures, visual and accessibility checks, production-package contracts, and separate real-YouTube compatibility checks.

Start with the [engineering overview](docs/engineering.md) for a code map and the [documentation hub](docs/README.md) for the area you want to explore.

### Run locally

Use Node.js 24 and the Yarn version pinned in `package.json`.

```bash
corepack enable
yarn install --immutable
yarn dev              # Chrome; use yarn dev:firefox for Firefox
```

For code, configuration, or dependency changes, complete the local quality gate:

```bash
yarn verify
```

Setup, browser-test prerequisites, and additional package/release gates are in [CONTRIBUTING.md](CONTRIBUTING.md) and the [testing contracts](docs/testing/contracts.md).

## Help shape the extension

Bug reports, translations, documentation improvements, and focused fixes are welcome. A small change that makes chat easier to read or a reproduction that explains a YouTube compatibility issue can help the next viewer.

- [Report a bug](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml) or [suggest a feature](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=feature.yml).
- Read the [contribution guide](CONTRIBUTING.md) to make your first change.
- Follow [SECURITY.md](SECURITY.md) for private vulnerability reports.

Licensed under [GPL-3.0](LICENSE).
