---
name: quality-gates
description: このリポジトリの品質ゲート実行手順。lint/typecheck/unit/build/e2e/CI 検証を求められたときに使う。
metadata:
  short-description: 品質ゲートを正しい順序で実行
---

# 目的
- 変更規模に応じた妥当な検証を実行し、結果を明確に報告する。

# 手順
1. 変更範囲を確認する。
- `git status -sb`
- 必要なら `git diff --name-only`
2. 常に実行する。
- `yarn lint`
3. ロジック変更がある場合。
- `yarn test:unit`
4. ビルドする。
- `yarn build`
- 必要に応じて `yarn build:firefox`
5. UI/挙動/E2E 変更がある場合。
- 対象 spec を `yarn playwright test ... --workers=1`
- 最後に `yarn e2e`

# 出力形式
- 実行コマンド
- 結果要約（passed/skipped/failed）
- ブロッカーと次の具体手順
