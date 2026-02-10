<div align="center">
  <img src="public/icon/128.png" alt="YouTube Live Chat Fullscreen Logo" width="80" />
</div>
<br>
<h1 align="center">YouTube Live Chat Fullscreen</h1>
<p align="center">
  <a href="README.md">English (US)</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.zh-TW.md">繁體中文 (台灣)</a>
</p>
<p align="center">
  <a target="_blank" href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd">
    <img alt="Chrome Web Store Rating" src="https://img.shields.io/chrome-web-store/rating/dlnjcbkmomenmieechnmgglgcljhoepd?style=social&logo=googlechrome"/>
  </a>
  <a target="_blank" href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd">
    <img alt="Chrome Web Store Users" src="https://img.shields.io/chrome-web-store/users/dlnjcbkmomenmieechnmgglgcljhoepd?style=social&logo=googlechrome"/>
  </a>
  <a target="_blank" href="https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/">
    <img alt="Firefox Add-ons Rating" src="https://img.shields.io/amo/rating/youtube-live-chat-fullscreen?style=social&logo=firefox"/>
  </a>
  <a target="_blank" href="https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/">
    <img alt="Firefox Add-ons Users" src="https://img.shields.io/amo/users/youtube-live-chat-fullscreen?style=social&logo=firefox"/>
  </a>
  <a target="_blank" href="https://github.com/daichan132/Youtube-Live-Chat-Fullscreen">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/daichan132/Youtube-Live-Chat-Fullscreen?style=social"/>
  </a>
</p>

<p align="center">
  Keep YouTube Live in fullscreen and keep chatting without layout compromises.
</p>
<p align="center">
  <a target="_blank" href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd"><strong>Install on Chrome</strong></a> ·
  <a target="_blank" href="https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/"><strong>Install on Firefox</strong></a> ·
  <a target="_blank" href="https://github.com/daichan132/Youtube-Live-Chat-Fullscreen"><strong>Star on GitHub</strong></a>
</p>

## Why This Extension
- Watch streams in true fullscreen while still reading and sending chat messages.
- Drag and resize the chat overlay so it fits your stream setup, game HUD, or subtitles.
- Improve readability with chat style controls (background, font, blur, spacing, and more).
- Save and switch presets for different viewing contexts.
- Works with both live streams and archives that have chat replay.

## 30-Second Quick Start
1. Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd) or [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/).
2. Open a YouTube live stream, or an archive video with replay chat.
3. Enter fullscreen and toggle chat from the switch at the bottom-right.
4. Drag/resize the overlay and tune styles from the extension settings.

## Mode Behavior (Live / Archive / No Chat)
| Video state | Chat source used by extension | Switch / Overlay |
| --- | --- | --- |
| Live stream | Public `live_chat?v=<videoId>` | Available |
| Archive with replay chat | Native `live_chat_replay` iframe | Available when replay is playable |
| No chat / replay unavailable | None | Hidden |

## Preview
![Preview](./.github/preview.png)

## Key Features
- Fullscreen chat posting, including Super Chat posting flow.
- Overlay drag, resize, and position control.
- Visual customization: background color, font color, font family, font size, blur, spacing.
- Display toggles: username, user icon, Super Chat bar, and chat-only view.
- Preset management for quick style switching.
- Multi-language support.

## Download
- [Chrome Web Store](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd)
- [Firefox Browser Add-ons](https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/)

## Development Setup
### Requirements
- **[Node.js](https://nodejs.org)** (v22.x)
- **[Yarn](https://yarnpkg.com)** (via Corepack recommended)

### Install
```bash
git clone https://github.com/daichan132/Youtube-Live-Chat-Fullscreen.git
cd Youtube-Live-Chat-Fullscreen
corepack enable
yarn install
```

### Commands
- `yarn dev`: Start development server.
- `yarn dev:firefox`: Start development server for Firefox.
- `yarn build`: Build the project.
- `yarn build:firefox`: Build for Firefox.
- `yarn zip`: Create a zip package.
- `yarn zip:firefox`: Create a Firefox zip package.
- `yarn lint`: Run Biome checks and TypeScript type checks.
- `yarn test:unit`: Run unit tests.
- `yarn storybook`: Launch Storybook.
- `yarn storybook:build`: Build static Storybook output.
- `yarn e2e`: Run end-to-end tests.

In Storybook, open `Catalog/CurrentUIDesigns` to review the current UI design in one place.

## Quality Checks
Run these before opening a pull request:

```bash
yarn lint
yarn test:unit
yarn build
```

For Firefox compatibility changes, also run:

```bash
yarn build:firefox
```

## Project Overview
This extension uses a content script to control fullscreen chat behavior on YouTube pages. Popup settings (language, on/off, theme) are synced with content runtime state.

![System](./.github/system_overview.drawio.png)

## Contributing
Contributions are welcome. If you have ideas, bugs, or improvements:
- Open an issue or submit a pull request.

## Support
If this extension improves your YouTube workflow, starring this repo helps a lot.

- [Star this repository](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen)
- [Support on Ko-fi](https://ko-fi.com/D1D01A39U6)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/D1D01A39U6)

## License
Licensed under GPL-3.0. See [LICENSE](LICENSE) for details.

## Translations
- English (US): `README.md`
- 日本語: `README.ja.md`
- 繁體中文 (台灣): `README.zh-TW.md`

Contributions for additional languages are welcome. Follow the same filename pattern: `README.<locale>.md`.
