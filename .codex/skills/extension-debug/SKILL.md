---
name: extension-debug
description: Chrome/Firefox 拡張の挙動調査。content script / popup / service worker の不具合再現、フルスクリーン/ネイティブチャットのループ調査で使う。
metadata:
  short-description: 拡張ランタイム不具合を切り分け
---

# 目的
- 最短で再現し、症状を境界ごとに切り分けて根本原因を特定する。

# 入力（不足時のみ確認）
- 対象ブラウザ（Chrome/Firefox）
- 再現 URL と手順
- どの層で壊れるか（content/popup/background）

# 手順
1. 最新ビルドを作る。
- `yarn build`（Firefox は `yarn build:firefox`）
2. 再現手順を1回通し、壊れる地点を固定する。
3. その時点の状態を採取する。
- fullscreen 状態
- switch（存在有無 / `aria-pressed`）
- native iframe（`#chatframe` href/playable）
- extension iframe（`data-ylc-chat` / `data-ylc-owned` / `src`）
4. 境界にマッピングする。
- mode 判定
- source resolver
- toggle/overlay gating
- native auto-disable
5. 最小修正して検証する。
- `yarn lint`
- 必要な unit/e2e

# ガードレール
- デバッグ中に大規模リファクタを混ぜない。
- permissions 変更は明示依頼がある場合のみ。

# 出力形式
- 再現手順
- 根本原因
- 変更概要
- 検証結果
