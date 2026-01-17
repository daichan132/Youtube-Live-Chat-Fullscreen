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

## 追加で発生した不具合（右側の YouTube ネイティブチャットが使えない）
### 症状
- 右カラムのネイティブチャットが表示されない、またはクリックできない
- 全画面切替後に元のチャットが戻らないケースがある

### 原因（今回の調査結果）
- **チャット iframe の DOM 移動**  
  オーバーレイ表示のため `ytd-live-chat-frame` 内の iframe を移動していたため、
  右側のネイティブチャットが空になる。  
  → 対応: ネイティブ iframe は元の場所に残し、拡張側は `cloneNode` で複製して表示。
- **pointer-events が戻らない**  
  ドラッグ中に `ytd-app` の `pointer-events: none` を設定していたが、
  後始末が漏れるとネイティブ UI 全体が操作不可になる。  
  → 対応: ドラッグ終了時と `useEffect` の cleanup で `pointer-events: auto` に復帰。
- **全画面レイアウト修正の適用範囲が広い**  
  全画面時のレイアウト修正が拡張 UI の ON/OFF と無関係に効くと、
  ネイティブチャットの領域が常に潰される。  
  → 対応: 全画面かつ拡張チャット ON のときだけ適用し、`html` にクラスを付けて CSS を限定。

### 再発防止（テスト）
- Playwright で「全画面切替後に右側のネイティブチャットが表示・操作可能か」を検証するテストを追加。
