<div align="center">
  <img src="public/icon/128.png" alt="YouTube Live Chat Fullscreen Logo" width="80" />
</div>
<br>
<h1 align="center">Youtube Live Chat Fullscreen</h1>
<p align="center">
  <a target="_blank" href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd">
    <img alt="Chrome Web Store Rating" src="https://img.shields.io/chrome-web-store/rating/dlnjcbkmomenmieechnmgglgcljhoepd?style=social&logo=googlechrome"/>
  </a>
  <a target="_blank" href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd">
    <img alt="Chrome Web Store Users" src="https://img.shields.io/chrome-web-store/users/dlnjcbkmomenmieechnmgglgcljhoepd?style=social&logo=googlechrome"/>
  </a>
  <a target="_blank" href="https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/">
    <img alt="Firefox Add-ons Rating" src="https://img.shields.io/amo/rating/youtube-live-chat-fullscreen?style=social&logo=firefox"/>
  </a>
  <a target="_blank" href="https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/">
    <img alt="Firefox Add-ons Users" src="https://img.shields.io/amo/users/youtube-live-chat-fullscreen?style=social&logo=firefox"/>
  </a>
</p>
<br>

Using this extension, you can display the chat panel and post comments while keeping YouTube Live in full-screen mode.

## Download
- [Chrome Web Store](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd)
- [Firefox Browser Add-ons](https://addons.mozilla.org/ja/firefox/addon/youtube-live-chat-fullscreen/)


## Features
💬 Post comments and Super Chats even in full-screen mode.

✒️ Freely customize the chat appearance, including background color, text color, and font size.

⚙️ Adjust the size and position of the chat window as desired.

🌐 Supports multiple languages to cater to a wide range of users.

## Preview
![Preview](./.github/preview.png)

## Project Overview
This extension works by using a content script to manage the chat on YouTube Live. The popup provides settings for language and turning the extension on/off. The content script and popup communicate directly to keep your language choices and extension status aligned.

![System](./.github/system_overview.drawio.png)

## Getting Started

### Requirements

Before you begin, ensure you have the following software installed:

- **[Node.js](https://nodejs.org)** (v22.x)
- **[Yarn](https://yarnpkg.com)**

> [!NOTE]
> If Yarn is not installed, run `npm install -g yarn` to install it globally.

### install

Clone the repository and install the dependencies:

```bash
git clone https://github.com/daichan132/Youtube-Live-Chat-Fullscreen.git
cd Youtube-Live-Chat-Fullscreen
yarn install
```

Alternatively, you can fork the repository to create your own version and customize it.

### commands
- `dev`: Start development server.
- `dev:firefox`: Start development server for Firefox.
- `build`: Build the project.
- `build:firefox`: Build the project for Firefox.
- `zip`: Create a zip package.
- `zip:firefox`: Create a Firefox zip package.
- `format`: Format code.
- `lint`: Run lint checks.
- `e2e`: Run end-to-end tests.

## Contributing
Contributions are welcome! If you have ideas, bug reports, or improvements, please feel free to open an issue or submit a pull request on GitHub.

## Sponsor
If you enjoy using this extension, please consider supporting the project.
Your contributions help keep the project running and allow for future improvements.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/D1D01A39U6)

## License
Licensed under GPL-3.0. See [LICENSE](LICENSE) for details.

