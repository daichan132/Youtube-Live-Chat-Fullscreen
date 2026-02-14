---
name: fullscreen-chat-contracts
description: フルスクリーンチャットの実行時契約を守るためのガイド。Content/YTDLiveChat/ソース解決/スイッチ挙動を変更するときに使う。
metadata:
  short-description: フルスクリーンチャット契約を強制
---

# 目的
- live / archive / no-chat 境界の破壊を防ぎ、同種回帰を再発させない。

# コア契約
1. live
- 公開 iframe URL `https://www.youtube.com/live_chat?v=<videoId>` を使う。
- native iframe を borrow しない。

2. archive
- native `live_chat_replay` iframe のみ borrow する。
- 動画遷移後の stale iframe 再利用を禁止する。

3. no-chat / replay-unavailable
- switch は表示しない。
- overlay / extension iframe は表示しない。

4. toggle 判定と source 判定の分離
- `canToggle`（操作可否）と `sourceReady`（attach 可否）は分ける。
- archive で `sourceReady` だけを switch 有効条件にしない（deadlock 防止）。

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
隠蔽方式の選択を誤ると、フルスクリーン解除後に native chat のコメント読み込みが遅延する。

| 方式 | 描画ツリー | iframe タイマー | 用途 |
|------|-----------|---------------|------|
| `display: none` | 除外される | 強くスロットル | iframe を含まない要素（`#panels` 等） |
| `visibility: hidden` + `position: fixed` + `width: 400px` | 維持される | スロットルされにくい | iframe を含む要素（`#secondary`, `#panels-full-bleed-container`） |
| `width: 0` + `overflow: hidden` | 維持されるが面積ゼロ | スロットル | **使わない**（過去の回帰原因） |

### 必須ルール

1. `#chatframe` iframe を含む可能性がある祖先要素には `display: none` を使わない
2. `visibility: hidden` + `position: fixed` + `top: -200vh` で画面外に配置する
3. `width: 400px`（チャットパネル標準幅）を明示して iframe に十分な描画面積を与える
4. `pointer-events: none` + `z-index: -9999` で操作・表示の干渉を防ぐ

### archive borrow 時の注意

archive モードでは拡張が native `#chatframe` を shadow root に物理移動（borrow）する。
この場合、元のコンテナに iframe は残らないため CSS による幅維持の恩恵はない。
ただしコンテナの描画ツリーを維持しておくことで、iframe 返却時の YouTube 再レイアウトが高速化する。

## `useFullscreenChatLayoutFix.ts` のCSS構成

```
#secondary                    → position: fixed（フローから除外、幅400px維持）
#panels-full-bleed-container  → position: fixed（#chat-container の実際の親、幅400px・高さ600px維持）
#panels                       → display: none（iframe を含まない、完全非表示で問題なし）
#columns / #primary 等        → width: 100%（動画が全幅を占めるように）
```

# スタイル契約（blur / background）
1. blur 適用先
- blur は iframe host ではなく iframe document の `body` に適用する。
- `useYLCBlurChange` で `body.style.backdropFilter` と `-webkit-backdrop-filter` を更新する。
- iframe host 側の `filter` は常に `none` に戻し、文字ぼけ回帰を防ぐ。

2. background 適用先
- `--yt-live-chat-background-color` は `transparent` を維持する。
- 暗色化が必要な内部変数のみ darken 済み RGBA を適用する。

3. iframe サーフェス透過
- `entrypoints/content/features/YTDLiveChatIframe/styles/iframe.css` で
  `html/body` と主要 chat コンテナ背景を透過させる。
- これにより外側オーバーレイ背景と iframe body 側の blur を視認可能に保つ。

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

# 出力形式
- 契約チェック結果（pass/fail）
- 破った契約と修正内容
- 追加/更新した回帰テスト

# トリガー例
- 「live と archive の境界が壊れてないか確認して」
- 「switch disabled 周りを修正したい」
- 「押せない switch は非表示にしたい」
- 「fullscreen chat の仕様を守ってリファクタしたい」
