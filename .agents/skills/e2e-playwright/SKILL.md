---
name: e2e-playwright
description: この拡張の Playwright E2E 運用。E2E 失敗やフレーク調査、フルスクリーンチャット・チャットなし動画・リプレイ不可・アーカイブ遷移の E2E、trace/PWDEBUG デバッグで使う。
---

# 目的
- 回帰を隠さずに、E2E 失敗を再現・修正・再検証する。

# 入力（不足時のみ確認）
- 対象 spec（ファイル名または失敗テスト名）
- URL 固定値（`YLC_LIVE_URL`、`YLC_ARCHIVE_URL`、`YLC_ARCHIVE_NEXT_URL`、`YLC_REPLAY_UNAVAILABLE_URL`）
- URL 既定値は `e2e/config/testTargets.ts` を参照する。

# ガードレール
- 同一マシンで Playwright コマンドを並列実行しない。
- ランダム sleep や過剰な timeout 拡大で flaky を隠さない。
- 実装不具合を `skip` に逃がさない。

# 手順
1. E2E 前にビルドする。
- `yarn build`
2. まず対象 spec を直列で実行する。
- `yarn playwright test e2e/<spec>.spec.ts --workers=1`
3. モード契約に沿って判定する。
- live: `live_chat?v=<videoId>` を使う。
- archive: native `live_chat_replay` borrow のみ許可。
- no-chat / replay-unavailable: switch は表示しない、拡張 iframe は出さない。
4. `skip/fail` 境界を維持する。
- `skip`: URL ドリフトや外部前提不足。
- `fail`: 前提成立後に拡張挙動が崩れる。
5. 失敗/skip 時は状態証跡を残す。
- `url`、`fullscreen`、`aria-pressed`
- native iframe（href / playable）
- extension iframe（`data-ylc-chat` / `data-ylc-owned` / `src`）
6. 再検証する。
- 対象 spec を `--repeat-each=2`
- 最後に `yarn e2e`
7. CI 判定を確認する。
- `yarn e2e:ci` は required spec が `skip` だと失敗する。

# 出力形式
- 再現コマンド
- 根本原因（推測でなく根拠）
- 変更ファイル
- 検証結果（passed/skipped/failed）
- skip の妥当性（skip がある場合）
