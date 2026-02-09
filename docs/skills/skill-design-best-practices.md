# スキル設計ベストプラクティス（このプロジェクト向け）

更新日: 2026-02-09

## 目的
- `.codex/skills` をシンプルかつ再現性高く維持するための設計基準。

## 設計原則
1. 1 skill = 1責務。
2. `description` は1行で「どんなときに使うか」を明示する。
3. SKILL本文は短く（目安 20-60行）、実行手順は決定的に書く。
4. 失敗しやすい領域はガードレールを先に書く。
5. 出力形式を固定し、報告粒度を揃える。

## 運用原則
1. 既存 skill と責務が重なるなら統合、重ならないなら新規。
2. flaky 対策で sleep を増やす運用は禁止（状態待ち + timeout を使う）。
3. E2E は `skip` と `fail` の境界を明示する。
4. スキルが使いにくかったらその場で最小修正する。

## このプロジェクトでの重要契約
1. live: public `live_chat?v=<videoId>` のみ。
2. archive: native `live_chat_replay` borrow のみ。
3. no-chat/replay-unavailable: switch は表示するが disabled、overlay は出さない。
4. switch有効判定とsource attach判定を分離する（deadlock防止）。

## 現在の推奨 skill セット
- `e2e-playwright`
- `fullscreen-chat-contracts`
- `extension-debug`
- `i18n-ops`
- `quality-gates`
- `git-ops`
- `git-smart-commit`
- `pr-review`
- `gh-open-pr`
- `skill-builder`
