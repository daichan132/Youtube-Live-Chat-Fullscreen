---
name: git-ops
description: このリポジトリ向けの安全な Git 操作手順。差分確認、ステージ、分割、ブランチ状態確認を求められたときに使う。
metadata:
  short-description: 非破壊で Git 操作を行う
---

# 目的
- 安全性を保ちながら、差分の粒度と履歴の可読性を維持する。

# 手順
1. 状態確認
- `git status -sb`
- `git diff --stat`
- 必要箇所だけ `git diff -- <path>`
2. 意図的にステージ
- `git add <対象ファイル>`
3. ステージ内容確認
- `git diff --cached`

# ガードレール
- 明示依頼なしに破壊的操作（reset/restore）をしない。
- 無関係差分を同じコミットに混ぜない。

# 出力形式
- ブランチ状態
- ステージ対象
- コミット前リスク
