<div align="center">
  <img src="public/icon/128.png" alt="YouTube Live Chat Fullscreen 圖示" width="80" />
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
  <a target="_blank" href="https://addons.mozilla.org/zh-TW/firefox/addon/youtube-live-chat-fullscreen/">
    <img alt="Firefox Add-ons Rating" src="https://img.shields.io/amo/rating/youtube-live-chat-fullscreen?style=social&logo=firefox"/>
  </a>
  <a target="_blank" href="https://addons.mozilla.org/zh-TW/firefox/addon/youtube-live-chat-fullscreen/">
    <img alt="Firefox Add-ons Users" src="https://img.shields.io/amo/users/youtube-live-chat-fullscreen?style=social&logo=firefox"/>
  </a>
</p>
<br>

使用這個擴充功能，您在維持 YouTube 直播全螢幕的同時，仍可顯示聊天面板並傳送留言。

## 🚀 下載
- [Chrome 線上應用程式商店](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd)
- [Firefox 附加元件](https://addons.mozilla.org/zh-TW/firefox/addon/youtube-live-chat-fullscreen/)

## ✨ 功能
💬 即使在全螢幕模式，也能傳送留言與超級留言（Super Chat）。

✒️ 可自訂聊天外觀：背景色、文字色、字型大小等。

⚙️ 可依喜好調整聊天視窗的大小與位置。

🌐 支援多語系。

## 🖼️ 預覽
![Preview](./.github/preview.png)

## 📚 專案概覽
此擴充功能透過內容腳本（Content Script）控制 YouTube 直播的聊天。彈出視窗（Popup）可設定語言與啟用/停用。內容腳本與彈出視窗會直接溝通，同步語言偏好與擴充狀態。

![System](./.github/system_overview.drawio.png)

## 🛠️ 開始使用

### 環境需求
請先安裝以下軟體：

- **[Node.js](https://nodejs.org)** (v22.x)
- **[Yarn](https://yarnpkg.com)**

> [!NOTE]
> 若尚未安裝 Yarn，可執行 `npm install -g yarn` 進行全域安裝。

### 安裝

下載專案並安裝相依套件：

```bash
git clone https://github.com/daichan132/Youtube-Live-Chat-Fullscreen.git
cd Youtube-Live-Chat-Fullscreen
yarn install
```

也可以先 Fork 本專案，再依需求客製化。

### 指令
- `dev`: 啟動開發伺服器
- `dev:firefox`: 啟動 Firefox 開發伺服器
- `build`: 建置專案
- `build:firefox`: 針對 Firefox 建置
- `zip`: 建立 Zip 套件
- `zip:firefox`: 建立 Firefox 用 Zip 套件
- `format`: 格式化程式碼
- `lint`: 執行靜態檢查（Biome + TypeScript 型別檢查）
- `e2e`: 執行端對端測試

## 🤝 貢獻
歡迎提交想法、回報錯誤或提出改進，請於 GitHub 建立 Issue 或 Pull Request。

## 💖 贊助
若您喜歡這個擴充功能，歡迎贊助支持本專案，協助持續維護與改進。

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/D1D01A39U6)

## 📄 授權條款
採用 GPL-3.0 授權。詳見 [LICENSE](LICENSE)。
