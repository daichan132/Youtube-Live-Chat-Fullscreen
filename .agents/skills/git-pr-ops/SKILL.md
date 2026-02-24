---
name: git-pr-ops
description: このリポジトリ向けの Git 操作・コミット・PR 作成・PR レビュー手順。差分確認、コミット分割、PR 作成/ドラフト/更新、コードレビュー依頼のときに使う。
---

# 目的
- 安全性を保ちながら、差分の粒度と履歴の可読性を維持する。
- レビュー担当が「何を、なぜ、どう直したか」を短時間で判断できる PR を作成する。

# コミット方針
- runtime / e2e / docs など、関心ごとにファイルをグルーピングして分割コミットする。
- 形式: `<type>(<scope>): <summary>`
- ユーザー要望があれば日本語で書く。

---

# PR 作成

## 入力（不足時のみ確認）
- base ブランチ（通常 `main`）
- タイトル言語（デフォルト英語）
- 本文言語方針（デフォルト: 英語先頭 + 日本語を `<details>`）
- draft か ready か

## 手順
1. 事前確認をする。
- `git status -sb`
- `git fetch origin <base>`
- `git log --oneline origin/<base>..HEAD`
- `git diff --stat origin/<base>..HEAD`
- `gh pr list --state open --head <branch>`
2. タイトルを決める。
- 形式: `Type: concise impact summary`
3. 本文を組み立てる。
- 英語を上に置く。日本語が必要な場合: `<details><summary>日本語版</summary>...</details>` に入れる。
- 特に大きな変更では、以下が分かるように書く。
  - 何を改善したか（課題 / 設計判断 / 結果）
  - どのレイヤをどう変えたか（責務分離や境界）
  - 何で検証したか（実行コマンドと結果）
  - 既知のリスクや前提
4. PR を作成または更新する。
- 新規: `gh pr create --base <base> --head <branch> --title "..." --body-file <file>`
- 既存: `gh pr edit <number> --title "..." --body-file <file>`
5. `gh pr view <number> --json title,body,url` で反映を確認する。

---

# PR レビュー

1. 差分をファイル単位で確認する。
2. 高リスク経路を優先確認する: fullscreen トグル、mode/source 解決、native/extension の排他。
3. テスト妥当性を確認する: ロジック変更に unit、挙動変更に E2E があるか。
4. 重大度順に findings を返す。

---

# ガードレール
- 明示依頼なしに破壊的操作（force push, reset, restore）をしない。
- 無関係差分を同じコミットに混ぜない。
- 大きい差分で `gh pr create --fill` だけに頼らない。
- 実行していない検証コマンドを書かない。
- E2E の `skip` は「外部前提不足」か「不具合」かを本文で区別する。
- PR 説明を更新するときは、必ず `gh pr view` で反映内容を再確認する。
