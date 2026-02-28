---
name: fullscreen-chat-contracts
description: フルスクリーンチャットの実行時契約を守るためのガイド。Content/YTDLiveChat/ソース解決/スイッチ挙動/iframe 隠蔽方式/blur・background スタイルを変更するときに使う。live/archive/no-chat の境界、iframe の DOM 移動、CSS の隠蔽方式、スタイル適用先に関わるコードを触るときは必ず参照すること。
---

# Fullscreen Chat 契約

live / archive / no-chat 境界の破壊を防ぎ、過去の回帰バグを再発させないためのガイド。

## コア契約

1. **live**: 公開 iframe `live_chat?v=<videoId>` を使う。native iframe を borrow しない
2. **archive**: native `live_chat_replay` iframe のみ borrow する。動画遷移後に stale iframe を再利用しない
3. **no-chat / replay-unavailable**: switch を表示しない。overlay / extension iframe を出さない
4. **判定責務**: `canToggle`（スイッチ有効化）と `sourceReady`（attach 可否）は分離する。archive で `sourceReady` だけを switch 有効条件にしない（deadlock 回避）

## YouTube フルスクリーン時の DOM 移動

YouTube はフルスクリーン進入時に `#chat-container` を `#secondary-inner` から `#panels-full-bleed-container` に移動する。この挙動はコードからは読み取れず、Playwright 等で実際に確認する必要がある。

**落とし穴**: `#secondary` にだけ CSS を適用しても、フルスクリーン中の `#chat-container` には効かない。`#panels-full-bleed-container` にも同等の処理が必要。

## iframe 隠蔽方式

Chrome は表示面積ゼロまたは `display: none` 配下の iframe のタイマーを強くスロットルする。チャット iframe がスロットルされるとメッセージ更新が止まるため、隠蔽方式の選択が重要。

| 方式 | 使える場面 | 理由 |
|------|-----------|------|
| `display: none` | iframe を含まない要素のみ | スロットルされるが影響なし |
| `visibility: hidden` + `position: fixed` + `width: 400px` | iframe を含む要素 | 描画面積を維持しスロットルを回避 |
| `width: 0` + `overflow: hidden` | **使わない** | 過去の回帰原因。スロットルされる |

iframe を含む祖先要素を隠すときは `visibility: hidden` + `position: fixed` + `top: -200vh` で画面外に配置し、`pointer-events: none` + `z-index: -9999` で干渉を防ぐ。

## スタイル契約（blur / background）

過去の回帰で学んだルール:

1. **blur**: iframe host ではなく iframe document の `body` に適用する。host 側に `filter` をかけると iframe 全体がぼけて文字が読めなくなる
2. **background**: `--yt-live-chat-background-color` は `transparent` を維持する。暗色化は内部変数のみで行う
3. **iframe サーフェス透過**: `entrypoints/content/features/YTDLiveChatIframe/styles/iframe.css` で `html/body` と主要 chat コンテナ背景を透過させる
