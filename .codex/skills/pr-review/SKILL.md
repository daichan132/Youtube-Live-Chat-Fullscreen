---
name: pr-review
description: 回帰中心の PR レビュー手順。コードレビュー/PRレビュー/チェック依頼のときに使う。
metadata:
  short-description: 回帰とテスト不足を優先検出
---

# 目的
- バグ、回帰、見落としやすいテスト不足を先に検出する。

# 手順
1. 差分をファイル単位で確認する。
2. 高リスク経路を優先確認する。
- fullscreen トグル
- mode/source 解決
- native/extension の排他
3. テスト妥当性を確認する。
- ロジック変更に unit があるか
- 挙動変更に E2E があるか
4. 重大度順に findings を返す。

# 出力形式
- Findings（重大度順）
- 不明点/前提
- 要約（短く）
