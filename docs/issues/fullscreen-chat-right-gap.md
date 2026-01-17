# Fullscreen Chat Right Gap (YouTube 新プレイヤー) まとめ

## 症状
- 全画面表示でチャットを表示すると、右端に余白が残る
- チャットはオーバーレイで表示されるが、別のチャットパネル領域が確保され続ける

## 再現条件
- ログイン不要
- 対象動画: https://www.youtube.com/watch?v=LhGFOuz7ei0
- 手順:
  1. 動画を開く
  2. チャットを表示
  3. 全画面に切り替え
  4. 右端に余白が残る

## 原因（現時点の理解）
- 全画面でも `#chat-container` や右カラム（`#secondary`）が幅を持って残り、レイアウト枠を占有している
- さらに `#columns` / `#primary` の幅が 2 カラム前提のまま残る場合がある
- `#full-bleed-container` や `#player` が `100vw` にならず、左右に余白が残る場合がある
- その結果、プレーヤーの実表示領域が縮む

## 修正方針
- 全画面時は `#chat-container` と `#secondary` を幅 0 にして占有をなくす
- クリック干渉を避けるため `pointer-events: none` を付与
- `z-index` を下げてオーバーレイに影響しないようにする
- `#columns` / `#primary` / `#primary-inner` / `#full-bleed-container` は `width: 100%` に戻す
- `#full-bleed-container` / `#player` / `#player-container-*` / `#movie_player` を `100vw/100vh` に固定
- さらに `resize` イベントを複数回発火してプレイヤーの再レイアウトを促す

## 実装メモ
- 修正は `useFullscreenChatLayoutFix` の CSS で対応
- 対象 CSS:
  - `.html5-video-player.ytp-fullscreen` を `100vw / 100vh` に維持
  - `#chat-container` と `#secondary` に `width/min-width/max-width/flex: 0` を付与
  - `#columns` / `#primary` / `#primary-inner` / `#full-bleed-container` に `width: 100%` を付与
  - `#full-bleed-container` / `#player` / `#player-container-*` / `#movie_player` に `width: 100vw` と `height: 100vh` を付与
