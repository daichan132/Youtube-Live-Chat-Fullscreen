---
name: gh-open-pr
description: gh CLI で PR を作成する手順。PR 作成/ドラフトPR/PR更新依頼のときに使う。
metadata:
  short-description: gh で PR を作成
---

# 目的
- レビュー担当が「何を、なぜ、どう直したか」を短時間で判断できる PR を作成する。

# 入力（不足時のみ確認）
- base ブランチ（通常 `main`）
- タイトル言語（デフォルト英語）
- 本文言語方針（デフォルト: 英語先頭 + 日本語を `<details>`）
- draft か ready か

# ガードレール
- 明示依頼なしに force push しない。
- 大きい差分で `gh pr create --fill` だけに頼らない。
- 実行していない検証コマンドを書かない。
- E2E の `skip` は「外部前提不足」か「不具合」かを本文で区別する。
- PR 説明を更新するときは、必ず `gh pr view` で反映内容を再確認する。

# 手順
1. 事前確認をする。
- `git status -sb`
- `git fetch origin <base>`
- `git log --oneline origin/<base>..HEAD`
- `git diff --stat origin/<base>..HEAD`
- `gh pr list --state open --head <branch>`
2. タイトルを決める。
- 原則: 英語の要約タイトルにする。
- 形式: `Type: concise impact summary`
3. 本文を組み立てる。
- 原則: 英語を上に置く。
- 日本語が必要な場合: `<details><summary>日本語版</summary>...</details>` に入れる。
- 読み手が判断しやすいように、必要に応じて表を使って整理する。
- 特に大きな変更では、以下が分かるように書く。
  - 何を改善したか（課題 / 設計判断 / 結果）
  - どのレイヤをどう変えたか（責務分離や境界）
  - 何で検証したか（実行コマンドと結果）
  - 既知のリスクや前提
4. PR を作成または更新する。
- 新規: `gh pr create --base <base> --head <branch> --title \"...\" --body-file <file>`
- 既存: `gh pr edit <number> --title \"...\" --body-file <file>`
5. 反映確認をする。
- `gh pr view <number> --json title,body,url`
6. URL と要点を共有する。

# 出力形式
- PR タイトル
- PR URL
- 変更点サマリ（3行以内）
- 含めた検証と残リスク

# トリガー例
- 「main に PR 作って」
- 「PR の説明を分かりやすくして」
- 「英語版を上に、日本語は details にして」
- 「表を使って設計意図を書いて」
