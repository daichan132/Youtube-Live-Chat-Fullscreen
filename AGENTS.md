# AGENTS.md

YouTube のライブチャットをフルスクリーン上に重ねる Chrome / Firefox 拡張。WXT・React・TypeScript・Jotai・Tailwind CSS を使用する。
既存のライブ、アーカイブ、チャットなし、SPA 遷移の動作を保つことを変更の基準にする。

## 開発環境

Node.js 24 と `package.json` の `packageManager` で固定した Yarn を使う。セットアップの詳細は [CONTRIBUTING.md](CONTRIBUTING.md)。

```bash
yarn install --immutable
yarn dev              # Chrome
yarn dev:firefox      # Firefox
```

作業前に `git status --short` と関連する差分を確認し、無関係な変更を保全する。書式は既存コードと `biome.json` に合わせる。

## 変更対象に応じて読む資料

全体像は [docs/engineering.md](docs/engineering.md)、資料一覧は [docs/README.md](docs/README.md)。以下は変更する境界に関係するものを読む。

| 対象 | 正本文書 |
| --- | --- |
| route、session、iframe の所有・復元 | [content-runtime.md](docs/architecture/content-runtime.md) |
| 設定・ストレージ | [settings-and-state.md](docs/architecture/settings-and-state.md) |
| オーバーレイ UI・iframe スタイル | [overlay-and-styling.md](docs/architecture/overlay-and-styling.md) |
| 翻訳 | [i18n.md](docs/architecture/i18n.md) |
| テスト・package・CI の契約 | [contracts.md](docs/testing/contracts.md) |
| 実ブラウザ検証 | [verification-browser.md](docs/maintainers/verification-browser.md) |
| リリース | [release-runbook.md](docs/maintainers/release-runbook.md) |

## 変更時の制約

- 生成物 `public/locales/`、`public/_locales/`、`shared/i18n/generated/`、`.output/` は手で編集しない。
- 翻訳は `shared/i18n/assets/*.json` を編集し、`node scripts/generate-locales.mjs` と `yarn locales:check` を実行する。
- content runtime の変更は session の所有権と generation を守り、借りた YouTube の DOM・iframe を復元できるようにする。selector は `entrypoints/content/platform/youtube/selectorCatalog.ts` に集約する。
- 診断レポートに URL、video ID、チャット本文、ユーザー名を含めない。
- `cd.yml`・`publish.yml` の実行、version bump、tag、ストア公開は依頼された場合に行う。

## 検証と完了条件

- コード・設定・依存関係の変更は `yarn verify` を最終ゲートにする。`yarn check` だけでは完了しない。
- runtime の振る舞いは関連する決定的ブラウザテストで確認する。package・manifest・ビルドの変更は production package の契約も確認する。追加ゲートとテストの配置は上記の正本文書と検証スキルに従う。
- 文書だけの変更は参照先・記載コマンド・差分を確認する。新しい変更や未解決の懸念がなければ、成功した検証を繰り返さない。
- 振る舞いを変えたら関連するテストと正本文書も更新する。完了報告には変更内容、実行した検証、未検証の範囲を示す。

## リポジトリ管理のスキル

正本は `.agents/skills/`。スキル本体と参照資料はこのリポジトリで更新し、個人ディレクトリに複製しない。

- [triage-ylc-user-report](.agents/skills/triage-ylc-user-report/SKILL.md)：不具合報告・互換性問題の原因調査に使う。
- [verify-ylc-change](.agents/skills/verify-ylc-change/SKILL.md)：修正やコード・設定・依存関係の変更の検証に使う。
