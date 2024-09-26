<div align="center">
  <a href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd">
    <img src="public/images/extension_128.png" alt="YouTube Live Chat Fullscreen Logo" width="128"/>
  </a>
  <h1>YouTube Live Chat Fullscreen</h1>

  ![](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
  ![](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
  ![](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
  ![](https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square)
</div>

- [🚀 Overview](#-overview)
- [🌟 Features](#-features)
- [📸 Screenshots](#-screenshots)
- [🛠️ Built With](#️-built-with)
- [🎉 Getting Started](#-getting-started)
  - [🔧 Requirements](#-requirements)
  - [📥 Installation](#-installation)
  - [🔌 Loading the Extension](#-loading-the-extension)
    - [🚀 Chrome (Chromium, Manifest V3)](#-chrome-chromium-manifest-v3)
    - [🦊 Firefox (Manifest V2)](#-firefox-manifest-v2)
- [📜 Available Scripts](#-available-scripts)
- [📄 License](#-license)
- [📝 Third-Party Licenses](#-third-party-licenses)
- [🤝 Contributing](#-contributing)

## 🚀 Overview

**YouTube Live Chat Fullscreen** lets you watch YouTube Live videos in fullscreen while keeping the live chat visible and interactive. Enhance your viewing experience by integrating the live chat into fullscreen mode.

## 🌟 Features

- 🎥 **Live Chat in Fullscreen**: Watch and chat without leaving fullscreen mode.
- 🎨 **Customizable Appearance**: Adjust font size, colors, and transparency to your liking.
- 🖱️ **Flexible Positioning**: Drag and drop the chat window anywhere on your screen.
- 🌐 **Multi-language Support**: Accessible to users worldwide with multiple languages.

## 📸 Screenshots

|            Fullscreen Chat             |           Style Customization            |         Multi-language Support         |
| :------------------------------------: | :--------------------------------------: | :------------------------------------: |
| <img src="./readme-img/image.png" width="300" alt="Chat in Fullscreen"> | <img src="./readme-img/image1.png" width="300" alt="Style Customization"> | <img src="./readme-img/image2.png" width="300" alt="Multi-language Support"> |


## 🛠️ Built With

- **React**: For building the user interface.
- **TypeScript**: Provides static typing to enhance code reliability.
- **Vite**: Fast build tool for modern web projects.
- **Sass** and **typed-scss-modules**: For styling with SCSS and TypeScript support.
- **Zustand**: Lightweight state management library.
- **dnd-kit**: Drag-and-drop toolkit for React.
- **i18next**: Internationalization framework.
- **Biome**: Code formatting and linting tool.
- **Lefthook**: Git hooks management.
## 🎉 Getting Started

### 🔧 Requirements

Before you begin, ensure you have the following software installed:

- **[Node.js](https://nodejs.org)** (v22.x)
- **[Yarn](https://yarnpkg.com)**

> **Note**: If Yarn is not installed, run `npm install -g yarn` to install it globally.

### 📥 Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/yourusername/Youtube-Live-Chat-Fullscreen.git
cd Youtube-Live-Chat-Fullscreen
yarn install
```

### 🔌 Loading the Extension

#### 🚀 Chrome (Chromium, Manifest V3)

1. Open `chrome://extensions` in your browser.
2. Enable **Developer Mode**.
3. Click **Load unpacked**.
4. Select the `dist` folder from the project root.

#### 🦊 Firefox (Manifest V2)

1. Open `about:debugging` in your browser.
2. Click **This Firefox** (or **This Nightly**).
3. Click **Load Temporary Add-on...**.
4. Select any file in the `dist-firefox-v2` directory.

## 📜 Available Scripts

You can run the following scripts:

- `yarn dev`: Starts the development server with live reloading.
- `yarn build`: Builds the extension for production.
- `yarn clean`: Removes the `dist` and `dist-firefox-v2` folders.
- `yarn format`: Formats the code using Biome.
- `yarn lint`: Lints the code and performs type-checking.
- `yarn prepare`: Installs Git hooks using Lefthook.

For more details on these scripts, refer to the `package.json` file.

## 📄 License

This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](LICENSE) file for more details.

## 📝 Third-Party Licenses

This project utilizes third-party libraries and components, each subject to their own license terms:

- **browser-extension-react-typescript-starter**
  - License: MIT License
  - [View License Details](https://github.com/sinanbekar/browser-extension-react-typescript-starter/blob/main/LICENSE)

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to help improve this project.