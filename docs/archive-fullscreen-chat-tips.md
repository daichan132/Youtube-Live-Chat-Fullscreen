# Archive Fullscreen Chat Tips

更新日: 2026-02-08

## 目的
- アーカイブ動画で fullscreen chat が壊れやすいポイントを先に固定し、実装とE2Eを安定化する。

## Runtime 方針（現行）
- source 判定は 2 系統のみを使う。
  - live: direct `https://www.youtube.com/live_chat?v=<videoId>`（公開iframe）
  - archive: native replay iframe borrow（`live_chat_replay` のみ）
- live と archive の経路を混在させない。
- archive では stale iframe を残さない（動画遷移時に旧hrefを再利用しない）。

## Archive ユーザーフロー契約
- archive は以下の順序で成立する。
  - `open archive url -> fullscreen -> switch ON -> extension iframe playable`
- `#chatframe` の初期 `about:blank` は異常とは限らない。
- 事前に native 側 `href` playable を必須にしない。
  - 実ユーザーフローより厳しい前提になると flaky の原因になる。

## E2E 設計ルール
- 判定対象は extension 側を優先する。
  - `#shadow-root-live-chat iframe[data-ylc-chat="true"]` が attach + playable
- 外部要因で前提不成立なら `skip`、前提成立後の崩れだけ `fail`。
- `sleep` ベースの待機を避け、`expect.poll` + 明示状態で待つ。

## 環境変数（決定的実行）
- `YLC_ARCHIVE_URL`: archive 系テストの起点URL（必須）
- `YLC_ARCHIVE_NEXT_URL`: video transition の遷移先URL（必須）
- `YLC_REPLAY_UNAVAILABLE_URL`: replay-unavailable シナリオURL（必須）

## 主要 spec の意図
- `e2e/scenarios/archive/liveChatReplay.spec.ts`
  - archive fullscreen で拡張チャットが成立するか（borrow iframe が playable か）
- `e2e/scenarios/archive/fullscreenChatRestore.spec.ts`
  - fullscreen chat OFF 後に native chat が復帰するか
- `e2e/scenarios/archive/fullscreenChatVideoTransition.spec.ts`
  - 動画ID遷移後に旧動画の iframe が残留しないか
- `e2e/scenarios/archive/liveChatReplayUnavailable.spec.ts`
  - replay unavailable では switch は出るが無効化され、overlay は出ないか

## トラブルシュート最短チェック
- switch
  - 表示有無
  - `aria-pressed`
- native
  - `#chatframe` の有無
  - `src` / `contentDocument.location.href`
  - `#show-hide-button` と `#close-button`
- extension
  - `iframe[data-ylc-chat="true"]` の有無
  - `data-ylc-owned`
  - `yt-live-chat-renderer` / `yt-live-chat-item-list-renderer`
