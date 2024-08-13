<div align="center">
<a href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd"><img src="public/images/extension_128.png" alt="logo"/></a>
<h1> Youtube Live Chat Fullscreen</h1>

![](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![](https://img.shields.io/badge/Typescript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![](https://badges.aleen42.com/src/vitejs.svg)

This extension allows Youtube Live to use chat when in Fullscreen.

</div>

## App Screenshots

|        Chat is available in Fullscreen         |                  Style Change                   |                 Multi Language                  |
| :--------------------------------------------: | :---------------------------------------------: | :---------------------------------------------: |
| <img src="./readme-img/image.png" width="300"> | <img src="./readme-img/image1.png" width="300"> | <img src="./readme-img/image2.png" width="300"> |

### Built with

- React
- TypeScript
- Vite
- Biome (for format and lint)
- i18next (for internationalization)
- Zustand (for state management)
- Sass
- typed-scss-modules (for SCSS modules with TypeScript)
- lefthook (for git hooks management)
- dndkit (for drag functionality)

## Quick Start

Ensure you have

- [Node.js](https://nodejs.org) 22.x
- [Yarn](https://yarnpkg.com) installed

> **Note** If you don't have yarn installed, run: npm install -g yarn

### Clone to local

If you prefer to do it manually with the cleaner git history

```bash
npx degit daichan132/Youtube-Live-Chat-Fullscreen Youtube-Live-Chat-Fullscreen
cd Youtube-Live-Chat-Fullscreen
git init
```

Then run the following:

- `yarn install` to install dependencies.
- `yarn dev` to start the development server.
- `yarn build` to build an unpacked extension.

- **Load extension in Chrome (Chromium, Manifest V3)**

  - Go to the browser address bar and type `chrome://extensions`
  - Check the `Developer Mode` button to enable it.
  - Click on the `Load Unpacked Extension` button.
  - Select your `dist` folder in the project root.

- **Load extension in Firefox (Manifest V2)**

  - Go to the browser address bar and type `about://debugger`
  - Click on the `Load Temporary Add-on` button.
  - Select your `dist-firefox-v2` folder in the project root.

### Available Commands

- `yarn clean` to remove `dist` and `dist-firefox-v2` folders. Called by `dev` and `build` commands.
- `yarn format` to format code with Biome.
- `yarn lint` to lint code with Biome and type-check.
- `yarn prepare` to install Git hooks with Lefthook.

## License

This project is licensed under the GPL-3.0 license. See the [LICENSE](LICENSE) file for more details.

## Third-Party Licenses

This project uses third-party libraries or components, each subject to their own license terms. Please see below for details on each license.

- browser-extension-react-typescript-starter
  - License: MIT License
  - License Details: [Here](https://github.com/sinanbekar/browser-extension-react-typescript-starter/blob/main/LICENSE)
