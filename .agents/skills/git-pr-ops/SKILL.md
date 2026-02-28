---
name: git-pr-ops
description: このリポジトリ向けの Git 操作・コミット・PR 作成・PR レビュー手順。差分確認、コミット分割、PR 作成/ドラフト/更新、コードレビュー依頼のときに使う。
---

# Git / PR 運用 — YLC 固有ルール

汎用的な Git・PR 操作はシステムプロンプトに従う。本スキルはこのリポジトリ固有の規約のみ記載する。

## コミット前チェック

- **基本3点セット**: `yarn lint` → `yarn test:unit` → `yarn build`
- **i18n 変更時は2箇所を同時に更新する**: `shared/i18n/assets/*.json`（ランタイム）+ `public/_locales/*/messages.json`（ストア表示）。片方だけ更新するとランタイムとストア表示で文言がずれる。

## コミット分割

runtime / e2e / docs など関心ごとにグルーピングして分割コミットする。無関係差分を混ぜない。

## PR 本文

- 言語方針: 英語先頭 + 日本語は `<details><summary>日本語版</summary>...</details>`
- 実行していない検証コマンドを書かない。
- E2E の `skip` は「外部前提不足」か「不具合」かを本文で区別する。

## PR レビュー — 高リスク経路

以下を優先確認する:
- fullscreen トグル・mode/source 解決・native/extension の排他
- ロジック変更に unit、挙動変更に E2E があるか
