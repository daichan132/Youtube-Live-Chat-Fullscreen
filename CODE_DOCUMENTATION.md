# YouTube Live Chat Fullscreen Code Explanation

This document provides an overview of the codebase for the YouTube Live Chat Fullscreen extension, aiming to help new contributors understand the project.

## 1. Project Overview

This extension allows users to display, view, and post (comments, Super Chats) in the chat while watching YouTube Live streams in fullscreen mode. It supports both Chrome and Firefox.

Key Features:

*   Display and interact with chat in fullscreen mode.
*   Customize chat window appearance (background color, text color, font size, blur, padding, etc.).
*   Freely change the position and size of the chat window.
*   Save, load, and reorder setting presets.
*   Multi-language support.

## 2. Directory Structure

The main directories and their roles are as follows:

```
.
├── biome.json                # Biome (Linter/Formatter) config
├── CODE_DOCUMENTATION.md     # This code documentation file
├── CODE_OF_CONDUCT.md        # Code of Conduct
├── lefthook.yml              # Lefthook (Git hooks) config
├── LICENSE                   # License (GPL-3.0)
├── package.json              # Project metadata, dependencies
├── playwright.config.ts      # Playwright (E2E testing) config
├── README.md                 # Project overview, usage, etc.
├── renovate.json             # Renovate (dependency update) config
├── tsconfig.json             # TypeScript config
├── uno.config.ts             # UnoCSS (CSS framework) config
├── web-ext.config.ts         # Web Extension (Firefox development) config
├── wxt.config.ts             # WXT (extension build tool) config
├── docs/                     # Documentation related (future use)
├── e2e/                      # End-to-End test code
│   ├── fixtures.ts           # Playwright test fixtures
│   ├── scenarios/            # Live / archive scenario specs
│   │   ├── live/             # Live-only validation specs
│   │   └── archive/          # Archive-only validation specs
│   └── support/              # Shared diagnostics and URL selection helpers
├── entrypoints/              # Extension entry points
│   ├── content/              # Content Script related
│   │   ├── Content.tsx       # Main component for Content Script
│   │   ├── index.tsx         # Entry file for Content Script
│   │   ├── YTDLiveChat.tsx   # Component managing the entire chat UI
│   │   ├── features/         # Main feature components
│   │   │   ├── Draggable/    # Drag & resize functionality
│   │   │   ├── YTDLiveChatIframe/ # Chat iframe wrapper and style application
│   │   │   ├── YTDLiveChatSetting/ # Settings modal
│   │   │   └── YTDLiveChatSwitch/ # Chat display toggle switch
│   │   ├── chat/             # Live/archive separated chat runtime
│   │   │   ├── live/         # Live source resolution (`/live_chat?v=...`)
│   │   │   ├── archive/      # Archive source resolution (`live_chat_replay` borrow)
│   │   │   ├── runtime/      # Mode detection, overlay visibility, mode-aware loader
│   │   │   └── shared/       # Iframe DOM helpers shared by both modes
│   │   ├── hooks/            # Custom hooks specific to Content Script
│   │   │   ├── globalState/  # Zustand store related hooks
│   │   │   ├── watchYouTubeUI/ # YouTube UI monitoring hook
│   │   │   └── ylcStyleChange/ # Chat style application hooks
│   │   └── utils/            # Utilities specific to Content Script
│   └── popup/                # Popup related
│       ├── index.html        # Popup HTML
│       ├── main.css          # Popup CSS
│       ├── main.tsx          # Popup entry file
│       ├── Popup.tsx         # Popup main component
│       └── components/       # Components for Popup
├── i18n_scripts/             # Internationalization (i18n) scripts (Python)
│   ├── config.json           # i18n script config
│   ├── pyproject.toml        # Python project config (uv)
│   ├── README.md             # i18n script description
│   ├── uv.lock               # Python dependency lock file (uv)
│   └── src/                  # i18n script source code
├── public/                   # Static assets
│   ├── _locales/             # Locale files for Chrome extension
│   └── icon/                 # Extension icons
└── shared/                   # Code shared across multiple entry points
    ├── components/           # Common UI components (Slider, Switch)
    ├── constants/            # Constants
    ├── hooks/                # Common custom hooks
    ├── i18n/                 # i18next config, translation assets
    ├── stores/               # Zustand state management stores
    ├── types/                # TypeScript type definitions
    └── utils/                # Common utility functions
```

## 3. Key Components and Features

### 3.1. Content Script (`entrypoints/content/`)

Injects into the YouTube page and handles the actual chat display and interaction.

*   **`Content.tsx`**:
    *   The starting point component for the entire Content Script.
    *   Creates a Shadow DOM (`#shadow-root-live-chat`) inside the YouTube player (`#movie_player`) and renders the UI within it. This prevents style conflicts with the main YouTube page.
    *   Renders the chat toggle switch (`YTDLiveChatSwitch`) displayed in fullscreen and the main chat window (`YTDLiveChat`).
*   **`YTDLiveChat.tsx`**:
    *   Manages the display/hiding of the entire chat window.
    *   Wrapped by the `features/Draggable` component to provide drag & resize functionality.
    *   Displays the actual YouTube chat iframe using the `features/YTDLiveChatIframe` component.
    *   Displays the settings modal using the `features/YTDLiveChatSetting` component.
*   **`features/Draggable/`**:
    *   Provides drag-and-drop movement and resizing functionality for the chat window using `dnd-kit` and `re-resizable`.
    *   Manages the logic for clipping (`clip-path`) to hide the chat header/input area using the `useClipPathManagement.ts` hook.
*   **`chat/`**:
    *   Separates runtime behavior by mode (`live` vs `archive`) to prevent source-mixing regressions.
    *   `live/resolveLiveSource.ts` only allows public live iframe route (`/live_chat?v=...`).
    *   `archive/resolveArchiveSource.ts` only allows native replay iframe borrow (`/live_chat_replay`).
    *   `runtime/overlayVisibility.ts` centralizes pure overlay-visibility rules.
*   **`features/YTDLiveChatIframe/`**:
    *   Renders the iframe container and loading indicator.
    *   Actual source attach/detach logic is handled by `chat/runtime/useChatIframeLoader.ts`.
    *   Uses CSS (`iframe.css`) and style change hooks (`useYLCStyleChange`) to apply custom styles to elements within the iframe.
*   **`features/YTDLiveChatSetting/`**:
    *   The modal UI for changing chat appearance (color, font, blur, etc.) and display settings (show username, show icon, etc.).
    *   Uses `react-modal`.
    *   Has tabs for settings (`SettingContent.tsx`) and preset management (`PresetContent.tsx`).
    *   Individual setting items are implemented in components within `YLCChangeItems/`.
*   **`features/YTDLiveChatSwitch/`**:
    *   The switch displayed on the YouTube player's control bar in fullscreen mode to toggle the chat window's visibility.
*   **`hooks/`**:
    *   `globalState/`: Hooks for getting and updating the state of Zustand stores in `shared/stores`.
    *   `watchYouTubeUI/`: Hooks for monitoring YouTube's fullscreen state and the presence of player elements.
    *   `ylcStyleChange/`: Hook group for dynamically applying style changes made in the settings modal to chat elements within the iframe.

### 3.2. Popup (`entrypoints/popup/`)

The popup window displayed when clicking the extension icon.

*   **`Popup.tsx`**:
    *   The main UI of the popup.
    *   Displays the language selector (`LanguageSelector.tsx`) and the main extension enable/disable switch (`YTDLiveChatSwitch.tsx`).
    *   Also displays related links (`Links.tsx`).
*   **`main.tsx`**:
    *   The entry point for the Popup. Initializes the React application and loads internationalization settings (`i18n`).

### 3.3. Shared (`shared/`)

Code shared between multiple entry points, such as Content Script and Popup.

*   **`components/`**: General-purpose UI components (Slider, Switch).
*   **`constants/`**: Constants used throughout the project (e.g., minimum resizable width/height).
*   **`hooks/`**: General-purpose custom hooks (e.g., `useMessage` - for i18n, `useShadowClickAway` - for detecting clicks inside/outside Shadow DOM).
*   **`i18n/`**:
    *   `config.ts`: `i18next` configuration file.
    *   `assets/`: Translation JSON files for each language.
    *   `language_codes.json`: List of supported languages.
*   **`stores/`**: State management stores using Zustand.
    *   `globalSettingStore.ts`: Manages global extension settings (language, enabled/disabled state). Persisted to `localStorage`.
    *   `ytdLiveChatStore.ts`: Manages chat window style, position, size, and preset settings. Persisted to `localStorage`.
    *   `ytdLiveChatNoLsStore.ts`: Manages temporary chat window states (hover state, settings modal visibility, iframe loading state, etc.). Not persisted.
*   **`types/`**: TypeScript type definitions used throughout the project.
*   **`utils/`**: General-purpose utility functions (e.g., `YLCInitSetting.ts` - initial style settings).

### 3.4. i18n Scripts (`i18n_scripts/`)

Python scripts for automatically generating and updating translation files.

*   Uses the OpenAI API to generate translation files in `public/_locales` and `shared/i18n/assets`.
*   Refer to `i18n_scripts/README.md` for details.

## 4. State Management (Zustand)

Uses the [Zustand](https://github.com/pmndrs/zustand) library for state management.

*   **`globalSettingStore`**: Holds global settings like language and enabled/disabled state.
*   **`ytdLiveChatStore`**: Holds user-customizable settings like chat window appearance, position, and presets, persisted to `localStorage`.
*   **`ytdLiveChatNoLsStore`**: Holds temporary UI states like hover status or modal visibility, reset on page reload.

Stores are defined in the `shared/stores/` directory. Using the `useShallow` hook (zustand/react/shallow) is recommended to prevent unnecessary re-renders.

## 5. Build and Development

Uses [WXT](https://wxt.dev/) as the build tool for the extension.

*   **Development**:
    *   `yarn dev`: Starts the development server for Chrome with hot-reloading enabled.
    *   `yarn dev:firefox`: Starts the development server for Firefox.
*   **Build**:
    *   `yarn build`: Generates a production build for Chrome (`.output/chrome-mv3`).
    *   `yarn build:firefox`: Generates a production build for Firefox (`.output/firefox-mv2`).
*   **Packaging**:
    *   `yarn zip`: Creates a zip file for Chrome (`.output/chrome-mv3.zip`).
    *   `yarn zip:firefox`: Creates a zip file for Firefox (`.output/firefox-mv2.zip`).

## 6. Testing

Uses [Playwright](https://playwright.dev/) for End-to-End (E2E) testing.

*   Test code is located in the `e2e/` directory.
*   Run tests using the `yarn e2e` command.
*   Requires a built extension (`yarn build` must be run first).

## 7. Other Tools

*   **Biome**: Lints and formats code (`biome.json`, `yarn lint`, `yarn format`).
*   **UnoCSS**: Utility-first CSS framework similar to Tailwind CSS (`uno.config.ts`).
*   **Lefthook**: Manages Git hooks to automatically run lint checks, etc., before commits or pushes (`lefthook.yml`).
*   **TypeScript**: Provides static typing (`tsconfig.json`).
*   **Renovate**: Automates dependency updates (`renovate.json`).

---

Hopefully, this document helps deepen your understanding of the project. If you have any questions, please refer to the existing code, related documents, or ask other developers.
