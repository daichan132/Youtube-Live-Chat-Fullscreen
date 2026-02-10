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
