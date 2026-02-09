---
name: gh-open-pr
description: gh CLI で PR を作成する手順。PR 作成/ドラフトPR/PR更新依頼のときに使う。
metadata:
  short-description: gh で PR を作成
---

# 目的
- 変更内容と検証結果が伝わる PR を正確に作成する。

# 手順
1. ブランチと作業ツリーを確認する。
2. コミット要約と検証結果を整理する。
3. PR を作成する。
- `gh pr create --fill`
- 必要なら `--title` / `--body-file` を明示
4. PR URL と要点を共有する。

# ガードレール
- 明示依頼なしに force push しない。

# 出力形式
- PR タイトル
- PR URL
- 含めた検証と残リスク
