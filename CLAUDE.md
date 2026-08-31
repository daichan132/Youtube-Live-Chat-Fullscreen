# CLAUDE.md

YouTube のライブチャットをフルスクリーン上にオーバーレイ表示するブラウザ拡張。WXT + React 19 + TypeScript + Jotai + Tailwind CSS v4、Chrome / Firefox 両対応。本番利用者がいるため、変更は「動く」だけでなく、既存のライブ・アーカイブ・チャットなし・SPA 遷移を壊さないことを基準に判断する。

このファイルは AI エージェントと、久しぶりに戻ってきたメンテナー向けの入口。詳細は正本ドキュメントへ寄せる。`AGENTS.md` はこのファイルへの symlink。

## 最初に読むもの

| 知りたいこと | 読む場所 |
| --- | --- |
| アーキテクチャ全体像 | [`docs/engineering.md`](docs/engineering.md) |
| content runtime（route / generation / lease / reconcile） | [`docs/architecture/content-runtime.md`](docs/architecture/content-runtime.md) |
| 設定・状態・ストレージ | [`docs/architecture/settings-and-state.md`](docs/architecture/settings-and-state.md) |
| オーバーレイ UI と iframe スタイル | [`docs/architecture/overlay-and-styling.md`](docs/architecture/overlay-and-styling.md) |
| 多言語生成 | [`docs/architecture/i18n.md`](docs/architecture/i18n.md) |
| テスト層と CI | [`docs/testing/contracts.md`](docs/testing/contracts.md) |
| 実ブラウザ検証 | [`docs/maintainers/verification-browser.md`](docs/maintainers/verification-browser.md) |
| リリース | [`docs/maintainers/release-runbook.md`](docs/maintainers/release-runbook.md) |

## コマンド

```bash
yarn install          # Node 24、Yarn は packageManager で固定
yarn dev              # Chrome 開発ビルド
yarn dev:firefox      # Firefox 開発ビルド
yarn check            # Biome + TypeScript + release-workflow 契約
yarn verify           # ★ 通常変更の最終ゲート
yarn test:core        # *.unit.spec.ts(x)、Node
yarn test:dom         # *.dom.spec.ts(x) と通常 source spec、jsdom
yarn test:contracts   # *.contract.spec.ts(x) と設定・検証契約
yarn test:package     # Chrome/Firefox ZIP と package 契約
yarn e2e:fixture      # 決定的 Playwright fixture
yarn verify:release   # 全 release ゲート
```

`yarn check` だけでは locale/store/coverage/contracts を含まない。通常の完了条件は `yarn verify`。

`yarn verify` の実体:

```text
yarn locales:check
yarn store:check
yarn check
yarn test:coverage
yarn test:contracts
```

Playwright を初めて動かす環境では `yarn playwright install --with-deps chromium` が必要。

## CI とリリース

Pull Request の CI は次を自動実行する。

- `quality`: `yarn verify`
- `package`: Chrome/Firefox の production ZIP 作成、package 契約、testing extension artifact
- `browser-contracts`: 決定的 Playwright fixture

Visual/accessibility と production ZIP の実起動 smoke は CI の `workflow_dispatch` で追加実行する。

`cd.yml` と `publish.yml` は依頼されない限り実行しない。version bump、tag、ストア公開も同様。リリースは候補作成と既存 artifact の公開を分離している。

## 触ってはいけないもの

生成物は手で編集しない。

- `public/locales/`
- `public/_locales/`
- `shared/i18n/generated/`
- `.output/`

翻訳は `shared/i18n/assets/*.json` を編集し、`node scripts/generate-locales.mjs && yarn locales:check`。

## content runtime の設計ルール

- runtime は content session ごとに `new ChatRuntimeImpl()` する。モジュールシングルトンにしない。
- 対応 surface は `/watch`、`/live/<videoId>`、`/@name/live`、`/channel/.../live`、`/c/.../live`、`/user/.../live`。判定の正本は `youtubeSurface.ts`。
- channel live 入口は URL だけでは video ID を持たない。player、watch surface、native chat から候補を集め、一意なときだけ採用する。
- 非同期処理は `SessionScope` に所有させる。古い generation の callback は現在の session を変更してはいけない。
- runtime model は意味的な `RuntimePlan` を返し、DOM 操作を行わない。
- `ChatIframeLease`、`PresentationLease`、`PlayerLayoutLease`、`ChatChromeLease` は、変更を戻す責務を持つ。借りた YouTube iframe は削除せず、可能な限り元の位置へ返す。
- 新しい YouTube selector は `platform/youtube/selectorCatalog.ts` の probe として追加する。active class が外れる状態変化を監視する場合は、安定した observer boundary も定義する。
- 診断レポートへ URL、video ID、チャット本文、ユーザー名を入れない。
- retry は有限にし、失敗時に無限ループや高頻度 MutationObserver を作らない。

これらは存在しない文字列ベースの architecture checker ではなく、型、責務分離、unit/DOM/contract/E2E テストで保証する。

## package / manifest の不変条件

`scripts/verify/check-package-contracts.mjs` が検証する。

- production manifest の権限と公開 resource を必要最小限に保つ。
- content script match は `config/packagePolicy.ts` を正本とする。
- `default_locale` と runtime locale inventory を一致させる。
- production output と ZIP に test bridge、source map、spec、fixture 資産を入れない。
- Firefox source archive は git 管理された再構築可能な入力だけを含める。

## テストの置き場所

Vitest は明示 suffix で環境を選ぶ。

| 命名 | project | environment |
| --- | --- | --- |
| `*.unit.spec.ts(x)` | core | Node |
| `*.dom.spec.ts(x)` | dom | jsdom（origin は `https://www.youtube.com/`） |
| `*.contract.spec.ts(x)` | contracts | Node |

既存の通常 `entrypoints/**/*.spec.ts(x)` / `shared/**/*.spec.ts(x)` は DOM project に入る。新規テストは必ず明示 suffix を使う。DOM project は unit/contract suffix を除外するため、複数 project に重複登録しない。

Playwright scenario は `e2e/config/projectClassification.ts` に 1 回だけ登録する。決定的な YouTube fixture は `.fixture.spec.ts` を使う。

## コーディング規約

Biome: シングルクォート、セミコロンなし、インデント 2、行幅 140。Biome の対象は `entrypoints/` と `shared/`。`e2e/`、`scripts/`、`tests/` は周囲の形式へ合わせる。

## この拡張で特に確認すること

- ライブ、アーカイブ、チャットなしを別々に確認する。
- `/watch` と live entry route の両方を確認する。
- SPA 遷移、player/iframe replacement、fullscreen exit で古い root・listener・timer・iframe を残さない。
- 字幕、player controls、menu、end screen に対する自動配置は、障害物内部の文字・子要素変更でも更新されること。
- 設定の書き込み失敗、同一 domain の競合、preset 上限、import/export の正規化を壊さない。
