# YouTube Playwright Tips

更新日: 2026-02-08

## TL;DR
- E2E前に必ず `yarn build` を実行する（Playwright は `.output/chrome-mv3` を読む）。
- 動画URLは固定できるなら環境変数で固定する。
  - live: `YLC_LIVE_URL='<url>'`
  - archive: `YLC_ARCHIVE_URL='<url>'`
- `yarn e2e -- ...` で引数が不安定な場合は `yarn playwright test ...` を使う。
- flaky 対策は `sleep` 追加ではなく、`expect.poll` + 明示的な状態判定で行う。
- 同一マシンで E2E を並列起動しない。

## 推奨実行フロー
1. `yarn build`
2. 対象 spec を単体で実行
3. 安定確認で `--repeat-each=2`
4. 必要時だけ関連 spec を束で実行

```bash
yarn build
YLC_ARCHIVE_URL='https://www.youtube.com/watch?v=CQaUs-vNgXo' yarn playwright test e2e/liveChatReplay.spec.ts --workers=1 --repeat-each=2
yarn playwright test e2e/nativeChatClosedExtensionLoads.spec.ts --workers=1 --repeat-each=2
yarn playwright test e2e/fullscreenChatToggle.spec.ts --workers=1 --repeat-each=2
```

## URL選定ルール
- live URL を自動探索するときは「Liveバッジだけ」で採用しない。
- 採用前に live-now 信号を確認する。
  - `.ytp-time-display.ytp-live`
  - `.ytp-live-badge.ytp-live-badge-is-livehead`
  - `ytd-watch-flexy[live-chat-present]` / `[live-chat-present-and-expanded]`
  - `ytInitialPlayerResponse` の `isLiveNow`
- archive URL は replay iframe が実際に存在する動画を使う。

## 判定基準（テストで見るべき状態）
- live:
  - extension iframe が attach される
  - `aria-pressed="true"` で switch が ON
- archive:
  - fullscreen 後に native chat を open できる
  - extension iframe が loaded
  - extension iframe 内に `yt-live-chat-renderer` と `yt-live-chat-item-list-renderer`
  - iframe が borrowed（`data-ylc-owned != 'true'`）

## Archiveで壊れやすい点
- 正しい順序を崩すと失敗しやすい。
  - `fullscreen -> native chat open -> replay playable -> extension attach`
- `about:blank` を loaded 扱いすると retry が止まりやすい。
- `#show-hide-button` だけ見て open 済みと誤判定しやすい。

## デバッグ観測ポイント
- switch:
  - 表示されているか
  - `aria-pressed`
- native:
  - `#chatframe` の有無
  - `src` と `contentDocument.location.href`
  - `#show-hide-button` / `#close-button` の状態
- extension:
  - `#shadow-root-live-chat` の有無
  - `iframe[data-ylc-chat="true"]` の有無
  - iframe doc の `readyState` と renderer/item-list

## よくある失敗と対処
- 変更したのに挙動が変わらない:
  - `yarn build` 未実行で古い `.output` を読んでいる可能性が高い。
- `switchPressed: true` なのに extension iframe が無い:
  - source resolve 条件を満たしていないか、native iframe が未準備。
- archive で intermittent failure:
  - 判定を「件数増加」ではなく「loaded + playable」に寄せる。

## アンチパターン
- `waitForTimeout` での固定待ちに依存する。
- 動画URLを1本だけハードコードし、期限切れ・終了配信を考慮しない。
- 実行環境で E2E を同時に複数起動する。

