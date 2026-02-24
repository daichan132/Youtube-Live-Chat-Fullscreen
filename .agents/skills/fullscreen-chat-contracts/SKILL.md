---
name: fullscreen-chat-contracts
description: フルスクリーンチャットの実行時契約を守るためのガイド。Content/YTDLiveChat/ソース解決/スイッチ挙動/iframe 隠蔽方式/blur・background スタイルを変更するときに使う。
---

# 目的
- live / archive / no-chat 境界の破壊を防ぎ、同種回帰を再発させない。

# コア契約
CLAUDE.md「Fullscreen Chat の重要契約」に定義。変更前に必ず確認する。

# YouTube DOM 再配置とフルスクリーンレイアウト契約

## YouTube のフルスクリーン時 DOM 移動

YouTube はフルスクリーン進入時に DOM 構造を動的に変更する。
CSS を書くときは **フルスクリーン中の実際の親要素** を Playwright 等で確認すること。

| 要素 | 通常時の親 | フルスクリーン時の親 |
|------|-----------|-------------------|
| `#chat-container` | `#secondary-inner`（`#secondary` 内） | **`#panels-full-bleed-container`**（`#secondary` 外） |
| `ytd-live-chat-frame` | `#chat-container` 内（変わらず） | `#chat-container` 内（変わらず） |

**重要**: `#secondary` にだけ CSS を適用しても、フルスクリーン中の `#chat-container` や
`#chatframe` には効かない。`#panels-full-bleed-container` にも同等の処理が必要。

## iframe 隠蔽方式の選択基準

Chrome は表示面積ゼロまたは `display: none` 配下の iframe に対してタイマースロットリングを行う。

| 方式 | iframe タイマー | 用途 |
|------|---------------|------|
| `display: none` | 強くスロットル | iframe を含まない要素（`#panels` 等） |
| `visibility: hidden` + `position: fixed` + `width: 400px` | スロットルされにくい | iframe を含む要素（`#secondary`, `#panels-full-bleed-container`） |
| `width: 0` + `overflow: hidden` | スロットル | **使わない**（過去の回帰原因） |

### 必須ルール
1. `#chatframe` iframe を含む可能性がある祖先要素には `display: none` を使わない
2. `visibility: hidden` + `position: fixed` + `top: -200vh` で画面外に配置する
3. `width: 400px`（チャットパネル標準幅）を明示して iframe に十分な描画面積を与える
4. `pointer-events: none` + `z-index: -9999` で操作・表示の干渉を防ぐ

### archive borrow 時の注意
archive モードでは拡張が native `#chatframe` を shadow root に物理移動（borrow）する。
元のコンテナに iframe は残らないが、描画ツリーを維持しておくことで iframe 返却時の YouTube 再レイアウトが高速化する。

## `useFullscreenChatLayoutFix.ts` のCSS構成

```
#secondary                    → position: fixed（フローから除外、幅400px維持）
#panels-full-bleed-container  → position: fixed（#chat-container の実際の親、幅400px・高さ600px維持）
#panels                       → display: none（iframe を含まない、完全非表示で問題なし）
#columns / #primary 等        → width: 100%（動画が全幅を占めるように）
```

# スタイル契約（blur / background）
1. blur: iframe host ではなく iframe document の `body` に適用する。iframe host 側の `filter` は常に `none` に戻す。
2. background: `--yt-live-chat-background-color` は `transparent` を維持する。暗色化は内部変数のみ。
3. iframe サーフェス透過: `entrypoints/content/features/YTDLiveChatIframe/styles/iframe.css` で `html/body` と主要 chat コンテナ背景を透過させる。

# 必須確認
- Unit:
  - live resolver が `isLiveNow` 単独で fail-open しない
  - 非表示条件で switch が描画されない
  - mode/source helper が期待通り
  - `useYLCBlurChange` が iframe body に blur を適用し、例外時に no-op する
  - `useYLCBgColorChange` が `--yt-live-chat-background-color: transparent` を維持する
- E2E 最低限:
  - `e2e/noChatVideo.spec.ts`
  - `e2e/scenarios/archive/liveChatReplayUnavailable.spec.ts`
  - live/archive 正常系を各1本
