---
name: i18n-ops
description: この拡張の i18n 更新手順。翻訳追加/改善、locale 品質確認、extensionName/description 更新、_locales 整合確認で使う。
metadata:
  short-description: locale 品質と整合性を維持
---

# 目的
- 翻訳品質を上げつつ、`shared` と `public/_locales` の契約を壊さない。

# プロジェクトルール
- 更新先は必ず両方。
  - `shared/i18n/assets`
  - `public/_locales`
- `extensionName` は各言語へ翻訳する（英語 locale は英語維持）。
- トグル系ラベルは原則名詞ベースで統一する。

# 手順
1. `rg` で対象キーと使用箇所を特定する。
2. `shared/i18n/assets/<locale>.json` を更新する。
3. 拡張表示文言は `public/_locales/<locale>/messages.json` も更新する。
4. 契約テストを実行する。
- `yarn test:unit shared/i18n/assets.spec.ts shared/i18n/publicLocales.spec.ts`
5. 品質ゲートを実行する。
- `yarn lint`
- `yarn build`

# ガードレール
- placeholder 名を locale 間でずらさない。
- 非英語 locale に英語取り残しを作らない。
- 低確度な意訳は避ける。

# 出力形式
- 変更キー
- 変更 locale
- 検証結果
