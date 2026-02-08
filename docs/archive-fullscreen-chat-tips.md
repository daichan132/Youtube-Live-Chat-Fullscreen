# Archive Fullscreen Chat Tips

更新日: 2026-02-08

## 目的
- アーカイブ動画で fullscreen chat が壊れやすいポイントを先に固定し、実装をシンプルに保つ。

## まず守る前提
- 順序は固定: `fullscreen` -> `native chat open` -> `replay iframe playable` -> `extension chat attach`
- `about:blank` の iframe は「準備未完了」として扱う（成功扱いしない）。
- native 側が安定する前に iframe を移動しない。

## アーカイブ実装の最小ポリシー
- source 判定は 2 系統だけに限定する:
  - live: direct `live_chat?v=<videoId>`
  - archive: native replay URL を使う managed iframe
- archive は native iframe DOM を直接 borrow/move しない。
- archive で source を返す条件:
  - current video と一致
  - `hasPlayableLiveChat()` が true

## よく壊れるパターン
- fullscreen 直後に quick-action の「Live chat」だけを押して、実際は native iframe が開かない。
- `switch` を ON にした瞬間の先走り open で、native 側が初期化前のまま止まる。
- `about:blank` を loaded 扱いして retry が止まる。

## 安定化のコツ
- open 操作は `ytd-live-chat-frame` / `#show-hide-button` 系を優先する。
- retry は「短周期 + 上限あり」にする（無限 retry しない）。
- state は単方向に寄せる:
  - `idle -> attaching -> initializing -> ready`
- attach 前に毎回チェック:
  - fullscreen 中か
  - source が解決済みか
  - src/docHref が non-blank か

## Playwright Tips（この領域）
- 先に `yarn build` してから E2E を実行する（古い `.output` を使わない）。
- archive URL は固定で渡す:
  - `YLC_ARCHIVE_URL='https://www.youtube.com/watch?v=CQaUs-vNgXo'`
- 判定は「message 件数増加」より「iframe loaded + playable」を優先する。
- `yarn e2e -- ...` で引数が不安定な場合は `yarn playwright test ...` を使う。

## トラブルシュート最短チェック
- native 側
  - `#chatframe` が存在するか
  - `src` / `contentDocument.location.href` が `about:blank` でないか
  - `#show-hide-button` だけで `#close-button` が出ていない状態が続いていないか
- extension 側
  - `iframe[data-ylc-chat="true"]` が存在するか
  - `src` が non-blank か
  - `yt-live-chat-renderer` と `yt-live-chat-item-list-renderer` が見えるか

## 次の簡素化で優先すること
- 条件分岐を増やすより、`source resolve` と `open/retry` の責務を分ける。
- 追加経路を作るときは「既存経路を削れるか」を先に検討する。
- 新しい fallback を入れる場合は、必ず「発火条件」と「停止条件」をセットで書く。
