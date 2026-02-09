---
name: git-smart-commit
description: レビューしやすいコミットを作る手順。良い粒度でコミットしたい、履歴を整理したい、と言われたときに使う。
metadata:
  short-description: 粒度の良いコミットを作成
---

# 目的
- 変更意図が追えるコミットを、最小の混在で作る。

# 手順
1. 関心ごとで分割する（runtime/e2e/docs など）。
2. 各単位で実行する。
- `git add <files>`
- `git commit -m "<type>(<scope>): <summary>"`
3. 仕上げ確認。
- `git status -sb`
- `git log --oneline -n <件数>`

# メッセージ方針
- 何がどう変わったかを明示する。
- ユーザー要望があれば日本語で書く。

# 出力形式
- コミット一覧（sha / message / scope）
