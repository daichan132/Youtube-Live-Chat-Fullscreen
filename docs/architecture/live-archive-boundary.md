# Live / Archive Boundary

更新日: 2026-02-09

## 目的
- fullscreen chat の runtime を `live` と `archive` で完全分離し、誤った source 混在を防ぐ。
- コードを見れば「どちらの挙動か」が追える構造にする。

## ディレクトリ構成
- `entrypoints/content/chat/live`
  - live 専用 source 解決（公開 iframe のみ）
- `entrypoints/content/chat/archive`
  - archive 専用 source 解決（native replay borrow のみ）
  - archive native chat open 補助
- `entrypoints/content/chat/runtime`
  - mode 判定
  - overlay 可視判定
  - mode-aware iframe loader
- `entrypoints/content/chat/shared`
  - iframe DOM 判定ユーティリティ

## Source 契約
- live:
  - 使う source は `https://www.youtube.com/live_chat?v=<videoId>` のみ。
  - native `#chatframe` を source として再利用しない。
- archive:
  - 使う source は native iframe borrow のみ。
  - `live_chat_replay` 以外は attach 不可。

## Import 境界ルール
- `chat/live` は `chat/archive` を import しない。
- `chat/archive` は `chat/live` を import しない。
- 共通化が必要なものだけ `chat/shared` / `chat/runtime/types` に置く。

## Overlay 可視判定
- 判定関数: `entrypoints/content/chat/runtime/overlayVisibility.ts`
- 入力責務:
  - `fullscreenSourceReady`
  - `userToggleEnabled`
  - `nativeChatOpenIntent`
  - `inlineVisible`
- fullscreen では source readiness を最優先に評価し、inline 判定を混ぜない。

## 回帰防止ポイント
- fullscreen 中の自動 OFF は「明示トグル操作」のみを契機にする。
- archive の動画遷移では stale iframe href を再利用しない。
- `yt-navigate-finish` 欠落時も video-id watch で遷移検知する。
