<div align="center">
  <img src="public/icon/128.png" alt="YouTube Live Chat Fullscreen Logo" width="96" />
</div>

<h1 align="center">YouTube Live Chat Fullscreen</h1>

<p align="center">
  A browser extension that overlays YouTube live chat on fullscreen video — drag, resize, and style it your way.
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.zh-TW.md">繁體中文</a>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd">
    <img alt="Chrome Web Store Rating" src="https://img.shields.io/chrome-web-store/rating/dlnjcbkmomenmieechnmgglgcljhoepd?style=for-the-badge&logo=googlechrome&logoColor=white&label=Chrome%20Rating"/>
  </a>
  <a href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd">
    <img alt="Chrome Web Store Users" src="https://img.shields.io/chrome-web-store/users/dlnjcbkmomenmieechnmgglgcljhoepd?style=for-the-badge&logo=googlechrome&logoColor=white&label=Chrome%20Users"/>
  </a>
  <a href="https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/">
    <img alt="Firefox Rating" src="https://img.shields.io/amo/rating/youtube-live-chat-fullscreen?style=for-the-badge&logo=firefox&logoColor=white&label=Firefox%20Rating"/>
  </a>
  <a href="https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/">
    <img alt="Firefox Users" src="https://img.shields.io/amo/users/youtube-live-chat-fullscreen?style=for-the-badge&logo=firefox&logoColor=white&label=Firefox%20Users"/>
  </a>
</p>

<p align="center">
  <a href="https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/stargazers">
    <img alt="GitHub Stars" src="https://img.shields.io/github/stars/daichan132/Youtube-Live-Chat-Fullscreen?style=for-the-badge&logo=github"/>
  </a>
  <a href="https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/releases/latest">
    <img alt="Version" src="https://img.shields.io/github/v/release/daichan132/Youtube-Live-Chat-Fullscreen?style=for-the-badge&label=Version"/>
  </a>
  <a href="LICENSE">
    <img alt="License" src="https://img.shields.io/github/license/daichan132/Youtube-Live-Chat-Fullscreen?style=for-the-badge"/>
  </a>
  <a href="https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/actions/workflows/ci.yml">
    <img alt="CI" src="https://img.shields.io/github/actions/workflow/status/daichan132/Youtube-Live-Chat-Fullscreen/ci.yml?style=for-the-badge&logo=githubactions&logoColor=white&label=CI"/>
  </a>
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd">
    <img alt="Install on Chrome" src="https://img.shields.io/badge/Chrome-Install-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white"/>
  </a>
  <a href="https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/">
    <img alt="Install on Firefox" src="https://img.shields.io/badge/Firefox-Install-FF7139?style=for-the-badge&logo=firefox&logoColor=white"/>
  </a>
</p>

---

## Preview

![Fullscreen chat overlay on a YouTube live stream](./.github/preview.png)

## 30-Second Quick Start

1. Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd) or [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/youtube-live-chat-fullscreen/).
2. Open a YouTube live stream or an archive with chat replay.
3. Enter fullscreen and toggle chat from the switch at the bottom-right.
4. Drag/resize the overlay and tune styles from the extension settings.

## Features

### 💬 Fullscreen Chat

- Watch streams in true fullscreen while reading and sending chat messages
- Post Super Chats directly from the overlay
- Works with both live streams and archives with chat replay

### 🎨 Style Customization

- Background color, font color, font family, font size, blur, and spacing controls
- Toggle username, user icon, Super Chat bar, and chat-only view
- Drag, resize, and reposition the chat overlay freely

### 📋 Presets

- Save and switch style presets for different viewing contexts
- Quick-switch between setups with one click

### 🌐 Internationalization

- 50+ languages supported out of the box

## Tech Stack

<p>
  <img alt="React" src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <a href="https://wxt.dev"><img alt="WXT" src="https://img.shields.io/badge/WXT-FF6C2C?style=flat-square&logoColor=white"/></a>
  <a href="https://zustand.docs.pmnd.rs"><img alt="Zustand" src="https://img.shields.io/badge/Zustand-443E38?style=flat-square&logoColor=white"/></a>
  <img alt="UnoCSS" src="https://img.shields.io/badge/UnoCSS-333333?style=flat-square&logo=unocss&logoColor=white"/>
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white"/>
  <img alt="Playwright" src="https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white"/>
  <img alt="Storybook" src="https://img.shields.io/badge/Storybook-FF4785?style=flat-square&logo=storybook&logoColor=white"/>
  <img alt="Biome" src="https://img.shields.io/badge/Biome-60A5FA?style=flat-square&logo=biome&logoColor=white"/>
</p>

## Architecture

<details>
<summary>Click to expand</summary>

### System Overview

![Architecture diagram showing content script, popup, and background service worker communication](./.github/system_overview.drawio.png)

The extension consists of two entrypoints that communicate via the browser's `tabs` and `runtime` messaging APIs:

| Component | Role |
| --- | --- |
| **Content Script** | Injected into YouTube pages. Renders the chat overlay, handles drag/resize, and manages chat source resolution (live vs. archive). |
| **Popup** | Extension toolbar UI. Controls language, enable/disable toggle, and theme. Syncs state to the content script in real time. |
| **Shared** | Common modules used by both entrypoints — stores (Zustand), i18n assets, UI components, theme, and utility functions. |

### Chat Source Resolution

The content script automatically detects the video type and selects the appropriate chat source:

| Video state | Chat source | Switch / Overlay |
| --- | --- | --- |
| Live stream | Public `live_chat?v=<videoId>` | Available |
| Archive with replay | Native `live_chat_replay` iframe | Available when replay is playable |
| No chat / replay unavailable | None | Hidden |

### Project Structure

```
entrypoints/
├── content/          # Content script (injected into YouTube)
│   ├── chat/         # Chat source resolution (live / archive)
│   ├── features/     # UI features (Draggable, Iframe, Settings, Switch)
│   └── hooks/        # Content-specific React hooks
├── popup/            # Popup UI (extension toolbar)
│   ├── components/   # Popup-specific components
│   └── utils/        # Popup utilities
shared/               # Shared across entrypoints
├── stores/           # Zustand state management
├── i18n/             # 50+ language assets
├── components/       # Shared UI components
├── theme/            # Theme configuration
└── hooks/            # Shared React hooks
```

</details>

## Development Setup

### Requirements

- **[Node.js](https://nodejs.org)** v22.x
- **[Yarn](https://yarnpkg.com)** (via Corepack recommended)

### Install

```bash
git clone https://github.com/daichan132/Youtube-Live-Chat-Fullscreen.git
cd Youtube-Live-Chat-Fullscreen
corepack enable
yarn install
```

### Commands

| Command | Description |
| --- | --- |
| `yarn dev` | Start dev server (Chrome) |
| `yarn dev:firefox` | Start dev server (Firefox) |
| `yarn build` | Production build (Chrome) |
| `yarn build:firefox` | Production build (Firefox) |
| `yarn zip` | Create zip package |
| `yarn zip:firefox` | Create Firefox zip package |
| `yarn lint` | Biome checks + TypeScript type checks |
| `yarn test:unit` | Run unit tests |
| `yarn storybook` | Launch Storybook |
| `yarn storybook:build` | Build static Storybook output |
| `yarn e2e` | Run E2E tests |

> In Storybook, open `Catalog/CurrentUIDesigns` to review the current UI design in one place.

### Quality Checks

Run before opening a pull request:

```bash
yarn lint
yarn test:unit
yarn build
```

For Firefox compatibility changes, also run `yarn build:firefox`.

## Contributing

Contributions are welcome! Whether it's bug reports, feature ideas, or pull requests — all help is appreciated.

- Open an [issue](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues) or submit a [pull request](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/pulls).
- Translation contributions are also welcome — add a `README.<locale>.md` for your language.

<a href="https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=daichan132/Youtube-Live-Chat-Fullscreen" alt="Contributors" />
</a>

## Support

If this extension improves your YouTube experience, a star helps a lot!

<p>
  <a href="https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/stargazers">
    <img alt="Star on GitHub" src="https://img.shields.io/badge/Star_on_GitHub-yellow?style=for-the-badge&logo=github&logoColor=white"/>
  </a>
  <a href="https://ko-fi.com/D1D01A39U6">
    <img alt="Support on Ko-fi" src="https://img.shields.io/badge/Support_on_Ko--fi-F16061?style=for-the-badge&logo=ko-fi&logoColor=white"/>
  </a>
</p>

## License

Licensed under GPL-3.0. See [LICENSE](LICENSE) for details.
