<div align="center">
  <img src="../../public/icon/128.png" alt="YouTube Live Chat Fullscreen 圖示" width="80" />
</div>

<h1 align="center">YouTube Live Chat Fullscreen</h1>

<p align="center">
  <strong>全螢幕看影片，也看得見聊天室。</strong><br />
  同時享受直播畫面與聊天室的反應。把 YouTube 原本的聊天室放到影片上，自由移動、調整大小與外觀。
</p>

<p align="center">
  Chrome &amp; Firefox · 直播與重播 · 55 個介面語系 · 免費開源
</p>

<p align="center">
  <a href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd"><strong>安裝到 Chrome</strong></a>
  ·
  <a href="https://addons.mozilla.org/zh-TW/firefox/addon/youtube-live-chat-fullscreen/"><strong>安裝到 Firefox</strong></a>
  ·
  <a href="user-guide.zh-TW.md">使用指南</a>
  ·
  <a href="../../README.md">English</a>
  ·
  <a href="README.ja.md">日本語</a>
  ·
  <strong>繁體中文</strong>
</p>

![Kazama Iroha 的直播與原生聊天輸入欄，觀眾身分已模糊處理](../store-assets/chrome-web-store/source/captures/default-chat.png)

*標準聊天室與原生輸入欄的範例，輸入中的訊息尚未送出。截圖中的觀眾身分已模糊處理。直播影像：Kazama Iroha / hololive。[來源與隱私處理（英文）](../store-assets/chrome-web-store/README.md#sources-and-privacy)。*

## 看影片，也跟上聊天

打王、看現場演出，或遇到大家同時有反應的瞬間，都能讓影片維持全螢幕，同時看見聊天室。直播存檔只要有可播放的聊天重播，就能一邊看錄影，一邊跟上當時的反應。

覆蓋視窗使用 YouTube 原本的聊天室。直播期間，不必離開全螢幕就能閱讀和留言；登入、留言、徽章與 Super Chat 仍遵循 YouTube 的規則及頻道的參與條件。

## 配合直播調整版面

依照觀看內容調整版面，位置與外觀會自動儲存。

| 想做的事 | 可以調整的項目 |
| --- | --- |
| 看清楚遊戲畫面或出演者 | 拖曳聊天室到其他位置，從邊緣或角落調整大小 |
| 看見聊天室後方的影片 | 調整背景顏色、透明度與模糊效果 |
| 配合觀看距離閱讀 | 更改字級、字型、顏色與訊息間距 |
| 專注閱讀訊息 | 隱藏一般訊息的使用者名稱與頭像 |
| 控制列隱藏後仍看見反應 | 讓聊天室持續顯示，也可選擇「僅顯示聊天室」版面 |
| 切換不同的閱讀樣式 | 為樣式取名並儲存；將設定匯出成 JSON 來備份或手動移到另一個瀏覽器 |

![背景完全透明、僅顯示訊息並保護觀眾身分的遊戲直播存檔](../store-assets/chrome-web-store/source/captures/transparent-chat.png)

*這是背景完全透明、僅顯示聊天訊息的重播版面。這張存檔範例沒有訊息輸入欄。直播影像：CohhCarnage。[來源與隱私處理（英文）](../store-assets/chrome-web-store/README.md#sources-and-privacy)。*

提供亮色、暗色與跟隨系統的主題，以及 55 個介面語系和由右至左的版面。[使用指南](user-guide.zh-TW.md)介紹預設樣式與各項操作。

## 開始觀看

1. 從 [Chrome 線上應用程式商店](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd) 或 [Firefox 附加元件](https://addons.mozilla.org/zh-TW/firefox/addon/youtube-live-chat-fullscreen/) 安裝。
2. 開啟 YouTube 直播，或聊天重播可播放的直播存檔，然後進入全螢幕。聊天顯示預設為開啟。
3. 將游標移到聊天視窗上即可顯示控制按鈕。拖曳移動把手來調整位置、從邊緣調整大小，或開啟設定來更改外觀。播放器的聊天按鈕可以切換顯示與隱藏。

本擴充功能適用於桌面瀏覽器，Chrome 版也能在 Opera 上執行。沒有可用聊天的影片，會保留一般的全螢幕播放器畫面。

預設樣式與備份的操作請看[使用指南](user-guide.zh-TW.md)；聊天視窗沒有出現時，請看[疑難排解](troubleshooting.zh-TW.md)。

## 查得到的隱私設計

擴充功能不需要額外帳號，也沒有分析 SDK 或追蹤服務。設定保存在此瀏覽器的 `browser.storage.local`，擴充功能不會把觀看活動或聊天內容傳送給開發者。YouTube 原本的聊天室仍會與 YouTube 通訊。

正式版 manifest 只要求 `storage` 權限，content script 與公開的擴充功能資源也都限定在 YouTube 使用。選擇額外字型時，可能會從 Google Fonts 下載。這些範圍可以在 [package policy](../../config/packagePolicy.ts) 與 [package checks](../../scripts/verify/check-package-contracts.mjs) 中確認。

## 探索實作

這是使用 WXT、React、TypeScript、Jotai 與 Tailwind CSS 開發的 Chrome / Firefox 擴充功能。小小的介面背後，需要處理幾個實際的瀏覽器問題：

本節連結的開發文件為英文。

- [跟上 YouTube 的頁面切換](../architecture/content-runtime.md)：借用原生聊天 iframe，配合影片切換更新顯示，離開全螢幕時再將它還原。
- [編輯外觀時即時預覽](../architecture/settings-and-state.md)：拖動滑桿時更新聊天室，同時依序處理編輯中的值、已儲存設定，以及其他擴充功能視窗的變更。
- [在本機重現瀏覽器行為](../testing/contracts.md)：以固定條件的 YouTube 測試頁面重現直播、重播與沒有聊天的情境，再另外確認實際網站的相容性。

[工程概覽](../engineering.md)連結各項行為與對應程式碼。[貢獻指南](../../CONTRIBUTING.md)提供可執行的小範例，方便在選擇修改項目前先試試看（兩者皆為英文）。

## 一起改善擴充功能

描述觀看時遇到的問題、改善翻譯、補充說明，或提交範圍明確的修正，都能參與。你不需要先理解整個內部執行流程；可以從[貢獻的起點](../../CONTRIBUTING.md#choose-a-starting-point)選擇適合的項目（英文）。

- [回報問題](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml)，或[提出功能建議](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=feature.yml)。
- 安全性漏洞請依 [SECURITY.md（英文）](../../SECURITY.md) 的非公開流程回報。

採用 [GPL-3.0](../../LICENSE) 授權。
