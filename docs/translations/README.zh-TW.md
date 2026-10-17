<p align="center">
  <img src="../store-assets/chrome-web-store/screenshots/01-introduction.png" alt="介紹插圖：YouTube Live Chat Fullscreen — 全螢幕也看得見即時聊天室" width="1000" />
</p>

<p align="center">
  <strong>全螢幕看影片，也看得見聊天室。</strong><br />
  把 YouTube 原本的聊天室，放到全螢幕影片上。
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd"><img src="https://img.shields.io/badge/Add_to_Chrome-4285F4?style=for-the-badge&amp;logo=googlechrome&amp;logoColor=white" alt="安裝到 Chrome" /></a>
  <a href="https://addons.mozilla.org/zh-TW/firefox/addon/youtube-live-chat-fullscreen/"><img src="https://img.shields.io/badge/Get_for_Firefox-FF7139?style=for-the-badge&amp;logo=firefoxbrowser&amp;logoColor=white" alt="安裝到 Firefox" /></a>
</p>

<p align="center">
  直播與重播 · 55 個介面語系 · 免費開源<br />
  <a href="user-guide.zh-TW.md">使用指南</a> · <a href="../../README.md">English</a> · <a href="README.ja.md">日本語</a> · <strong>繁體中文</strong>
</p>

## 選擇喜歡的版面

### 看直播，也加入聊天

[![Kazama Iroha 的全螢幕直播與原生聊天輸入欄，草稿尚未送出，觀眾身分已模糊處理](../store-assets/chrome-web-store/source/captures/default-chat.png)](../store-assets/chrome-web-store/source/captures/default-chat.png)

閱讀聊天訊息，也能用 YouTube 原本的輸入欄留言。圖片中輸入的訊息尚未送出。

<p>
  <a href="../store-assets/chrome-web-store/source/captures/transparent-chat.png"><img src="../store-assets/chrome-web-store/source/captures/transparent-chat.png" alt="CohhCarnage 的直播存檔，背景完全透明、僅顯示聊天訊息，觀眾身分已保護" width="49%" /></a>
  <a href="../store-assets/chrome-web-store/source/captures/custom-style.png"><img src="../store-assets/chrome-web-store/source/captures/custom-style.png" alt="DrLupo 的直播存檔，聊天室使用深藍色、Inter 字型與背景模糊，觀眾身分已保護" width="49%" /></a>
</p>

**透明樣式**，讓影片保持清楚。**自訂樣式**，選擇喜歡的顏色與字型。<br />
兩張都是僅顯示訊息的聊天重播範例，沒有訊息輸入欄。點開任一圖片即可查看原始解析度。

<sub>直播影像：Kazama Iroha / hololive、CohhCarnage、DrLupo。圖片中的觀眾身分已模糊處理或隱藏。<a href="../store-assets/chrome-web-store/README.md#sources-and-privacy">來源與隱私處理（英文）</a>。</sub>

## 調整成你的樣子

- **移動與縮放** — 配合遊戲畫面或出演者調整聊天室的位置。
- **顏色、透明度與模糊** — 調整背景、文字與訊息間距。
- **儲存樣式** — 為樣式取名並儲存，匯出設定來備份或移到另一個瀏覽器。

提供亮色、暗色與跟隨系統的主題，也支援由右至左的版面。[看看各項操作 →](user-guide.zh-TW.md)

## 3 步驟開始觀看

1. 用上方按鈕前往 Chrome 線上應用程式商店或 Firefox 附加元件，**安裝擴充功能**。
2. 開啟 YouTube 直播，或聊天重播可播放的直播存檔，**進入全螢幕**。
3. **調整聊天室**。將游標移到視窗上，即可移動、縮放或開啟設定。

聊天顯示預設為開啟，播放器的聊天按鈕可以切換顯示與隱藏。<br />
[需要協助？](troubleshooting.zh-TW.md) · [預設樣式與備份](user-guide.zh-TW.md)

<details>
<summary><strong>聊天室、瀏覽器支援與隱私</strong></summary>

覆蓋視窗使用 YouTube 原本的聊天室。登入、留言、徽章與 Super Chat 仍遵循 YouTube 的規則及頻道的參與條件。直播存檔會重播當時的對話。

本擴充功能適用於桌面瀏覽器，Chrome 版也能在 Opera 上執行。沒有可用聊天的影片，會保留一般的全螢幕播放器畫面。

擴充功能不需要額外帳號，也沒有分析 SDK 或追蹤服務。設定保存在此瀏覽器的 `browser.storage.local`，擴充功能不會把觀看活動或聊天內容傳送給開發者。YouTube 原本的聊天室仍會與 YouTube 通訊。選擇額外字型時，可能會從 Google Fonts 下載。

正式版 manifest 只要求 `storage` 權限，content script 與公開的擴充功能資源也都限定在 YouTube 使用。詳見 [package policy](../../config/packagePolicy.ts) 與 [package checks](../../scripts/verify/check-package-contracts.mjs)。

</details>

<details>
<summary><strong>探索實作</strong></summary>

這是使用 WXT、React、TypeScript、Jotai 與 Tailwind CSS 開發的 Chrome / Firefox 擴充功能。以下開發文件為英文。

- [內容執行流程](../architecture/content-runtime.md)：跟上 YouTube 的頁面切換，並還原借用的原生聊天 iframe。
- [設定與狀態](../architecture/settings-and-state.md)：即時預覽編輯內容，同時依序處理草稿、已儲存設定與其他擴充功能視窗的變更。
- [瀏覽器測試](../testing/contracts.md)：以固定條件的測試頁面重現直播、重播與沒有聊天的情境，再另外確認實際網站的相容性。

從[工程概覽](../engineering.md)或[貢獻的起點](../../CONTRIBUTING.md#choose-a-starting-point)開始探索。

</details>

## 一起改善擴充功能

[回報問題](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml) · [提出功能建議](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=feature.yml) · [改善翻譯或指南](../../CONTRIBUTING.md)

<sub>安全性漏洞的非公開回報流程：<a href="../../SECURITY.md">SECURITY.md（英文）</a> · 採用 <a href="../../LICENSE">GPL-3.0</a> 授權。</sub>
