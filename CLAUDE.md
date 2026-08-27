# CLAUDE.md

YouTube のライブチャットをフルスクリーン上にオーバーレイ表示するブラウザ拡張。WXT + React 19 + TypeScript + jotai + Tailwind CSS v4、Chrome / Firefox 両対応。Chrome Web Store で 2 万人以上が使用している本番プロダクトなので、変更は「動く」ではなく「壊さない」を基準に判断する。

このファイルは AI エージェントと、久しぶりに戻ってきた自分自身のための入口。**詳細を再掲するのではなく、正しいドキュメントへ誘導する**ことを目的とする。

## 最初に読むもの

| 知りたいこと | 読む場所 |
| --- | --- |
| アーキテクチャ全体像・用語・データフロー | [`docs/engineering.md`](docs/engineering.md) |
| content runtime の詳細（lease / generation / reconcile） | [`docs/architecture/content-runtime.md`](docs/architecture/content-runtime.md) |
| 設定・状態・ストレージ | [`docs/architecture/settings-and-state.md`](docs/architecture/settings-and-state.md) |
| オーバーレイ UI と iframe スタイル注入 | [`docs/architecture/overlay-and-styling.md`](docs/architecture/overlay-and-styling.md) |
| 多言語（55 ロケール）の生成パイプライン | [`docs/architecture/i18n.md`](docs/architecture/i18n.md) |
| どのテストがどの境界を証明するか | [`docs/testing/contracts.md`](docs/testing/contracts.md) |
| 実ブラウザでの目視検証手順 | [`docs/maintainers/verification-browser.md`](docs/maintainers/verification-browser.md) |
| リリースの切り方 | [`docs/maintainers/release-runbook.md`](docs/maintainers/release-runbook.md) |
| ドキュメント全体の地図 | [`docs/README.md`](docs/README.md) |

`AGENTS.md` はこのファイルへの symlink。

## コマンド

```bash
yarn install          # corepack enable 済みが前提。Node 24（mise.toml で固定）
yarn dev              # Chrome 開発ビルド（yarn dev:firefox で Firefox）
yarn build            # 本番ビルド（yarn build:firefox で Firefox）
yarn check            # ★ 変更後は必ずこれ。下記の通り lint だけではない
yarn fix              # Biome の safe fix を適用
yarn test:unit        # Vitest 3 プロジェクト（core / dom / contracts）すべて
yarn test:coverage    # ★ CI が実際に見ているのはこちら。閾値は vitest.coverage.ts
yarn e2e              # 決定的 Playwright fixture（PR ゲート）
```

**`yarn check` は lint ではない。** 実体は次の 6 つの連結（`package.json`）:

```
biome check ./entrypoints ./shared
tsc --noEmit
scripts/verify/check-release-workflow.mjs      # リリースワークフローの契約
scripts/verify/check-runtime-architecture.mjs  # ランタイム設計の契約
scripts/verify/check-store-listing.mjs         # ストア掲載文 55 言語の契約
scripts/verify/check-locales.mjs               # 生成ロケールの鮮度
```

`biome check` や `tsc --noEmit` を単体で走らせて「緑」と判断してはいけない。4 つの契約スクリプトが未実行のまま残る。

Playwright を初めて動かすときは `yarn playwright install --with-deps chromium` が必要（CI は各ジョブで明示的に実行している）。

## ローカルで再現できない CI ゲート

以下は `yarn check && yarn test:unit && yarn build` を通しても検出されない。該当する変更のときは明示的に走らせる。

| ゲート | 走らせ方 | 何を弾くか |
| --- | --- | --- |
| カバレッジ閾値 | `yarn test:coverage` | `vitest.coverage.ts` の全体閾値と 7 つのファイル別閾値 |
| 依存関係の公開日 | `yarn verify:dependency-age` | `yarn.lock` に増えた npm locator のうち、公開から 72 時間（`.yarnrc.yml` の `npmMinimalAgeGate: 4320m`）未満のもの |
| パッケージ契約 | `yarn test:package` | manifest の permissions / locale 数 / ZIP 同梱物、sources ZIP に git 管理外ファイルが混ざること |
| 視覚回帰 | `yarn test:visual` | ベースラインは **Ubuntu + Playwright 同梱 Chromium で撮ったもの**。macOS で撮り直すと CI で必ず落ちる |
| アクセシビリティ | `yarn test:accessibility` | axe-core 違反 |

## 触ってはいけないもの

**生成物（手で編集しない）** — `scripts/generate-locales.mjs` が毎回 `rm -rf` して作り直す。手編集は次回生成で消えるか、`Generated locale metadata is stale` で CI が落ちる。

- `public/locales/`
- `public/_locales/`
- `shared/i18n/generated/`（`localeMetadata.ts`, `translationTypes.ts`）
- `.output/`

翻訳を変えるときは `shared/i18n/assets/*.json` を編集し、`node scripts/generate-locales.mjs && yarn locales:check`。手順の全体は [`docs/architecture/i18n.md`](docs/architecture/i18n.md)。

**リリース操作（依頼されない限り実行しない）** — `package.json` の version bump、タグの push、`cd.yml` / `publish.yml` の workflow_dispatch。リリースは実ブラウザ検証の人間による申告を必須入力とする 2 段階の手動プロセス。手順は [`docs/maintainers/release-runbook.md`](docs/maintainers/release-runbook.md)。

## ランタイム設計の契約

`scripts/verify/check-runtime-architecture.mjs` が `yarn check` のたびに、特定ファイルに対する文字列・正規表現レベルの規則を検査する。失敗メッセージは 1 行だけでファイル名も行番号も出ないため、規則を知らないと原因にたどり着けない。エージェントが最初に手を出しがちなリファクタリングがそのまま禁止事項になっている。

- `ChatRuntime` を `export const chatRuntime = ...` のモジュールシングルトンにしない。content session ごとに生成する。
- `ChatRuntime.ts` の中で `window.setTimeout` / `setInterval` / `requestAnimationFrame` を直接呼ばない。非同期処理は `SessionScope` を経由する。
- `createContentSession.tsx` は `new ChatRuntimeImpl()` と `<ChatRuntimeProvider` の両方を含むこと。
- `entrypoints/content/index.tsx` で `createAppRuntime()` を呼ばない。`ContentBootstrap.ts` の `isYouTubeWatchSurface` による遅延初期化を保つ。
- `runtimeModel.ts` は意味的な `RuntimePlan` だけを返す。`ensure-observer` / `sync-portals` / `clear-layout` / `clear-runtime` のような低レベル DOM 操作名を書かない。
- 4 つの lease クラス（`ChatIframeLease` / `PresentationLease` / `PlayerLayoutLease` / `ChatChromeLease`）を消さない・改名しない。
- iframe の復元状態を `iframeAttachment.ts` のモジュールグローバル変数に持たない。`PlayerLayoutLease.ts` に `let applied` / `let resizeTimeouts` を置かない。
- YouTube のセレクタは `platform/youtube/selectorCatalog` を import して使う（`nativeChat.ts` と `e2e/utils/selectors.ts` は import の有無を検査される）。
- `SanitizedDiagnosticReport` 型に `videoId:` / `url:` フィールドを足さない。
- `entrypoints/content/runtime/readPageSnapshot.ts` と `useChatRuntime.ts` を復活させない。

注意: このスクリプトは文字列マッチであって静的解析ではない。「チェックが通った ＝ 設計として正しい」ではない。たとえばセレクタ重複の検査は存在せず、`ChatRuntime.ts` 内にカタログと同じセレクタ文字列がハードコードされていても通る。

## パッケージ / manifest の不変条件

`scripts/verify/check-package-contracts.mjs` が固定している。permission を 1 つ足すだけで落ちる。

- permissions は `activeTab` と `storage` のみ。`host_permissions` と `optional_permissions` は禁止。
- content script の match は `*://www.youtube.com/*` の 1 つだけ（`config/packagePolicy.ts` が単一の情報源。ただし checker 側にも同じ文字列がリテラルで書かれているので両方直す）。
- `default_locale` は `en`、ランタイムロケールはちょうど 55。
- ZIP と展開ディレクトリのファイル一覧はバイト単位で一致すること。
- sources ZIP に含まれるファイルはすべて `git ls-files` に載っていること（＝リポジトリ直下の untracked ファイルがリリースを止める）。
- `e2e.html`、`.map`、`*.spec` / `*.test`、fixture 資産は本番出力にも ZIP にも入らないこと。E2E ブリッジは WXT の `testing` モードでのみ注入される。

## テストの置き場所

Vitest はファイル名でプロジェクトを振り分ける（`vitest.config.ts`）。

| 命名 | プロジェクト | 環境 |
| --- | --- | --- |
| `*.unit.spec.ts` | core | node |
| `*.dom.spec.ts(x)` | dom | jsdom |
| `*.contract.spec.ts` | contracts | node |
| `entrypoints/**` `shared/**` の `*.spec.ts(x)` | dom | jsdom |
| `e2e/config/**` `e2e/support/**` の `*.spec.ts`、`scripts/verify/**/*.spec.mjs` | contracts | node |

新しい仕様は上の 3 つの明示的な命名を使う。`entrypoints/` 配下で `foo.spec.ts` と名付けると黙って jsdom 扱いになる。

Playwright のシナリオは **`e2e/config/projectClassification.ts` に登録しないと契約テストが落ちる**。未登録・二重登録・`.fixture.spec.ts` 以外の決定的プロジェクト配置はいずれも失敗する。

## コーディング規約

Biome（`biome.json`）: シングルクォート、セミコロンなし、アロー関数の括弧は必要時のみ、インデント 2、行幅 140。

**Biome の対象は `./entrypoints` と `./shared` だけ。** `scripts/`、`e2e/`、`tests/` 配下は誰にもフォーマットされないので、周囲のコードのスタイルに合わせる。

lefthook が pre-commit で staged ファイルに `biome check --apply` をかける。エージェントが整形した出力が commit 時に書き換わることがある。

## この拡張の性質上、特に注意すること

- **YouTube の DOM は動く。** セレクタを足すときは `selectorCatalog.ts` にフォールバック付きの probe として足す。1 か所に直書きしない。
- **借りた iframe は返す。** ライブ／アーカイブでは YouTube 自身の live chat iframe を借用して使う（投稿・スーパーチャット・認証を YouTube 側に残すため）。借用した DOM への変更はすべて元に戻せる形にする。インライン style を新しく足したら `YLC_DOCUMENT_STYLE_PROPERTIES` にも足す。
- **収集しない。** 診断レポートは URL・video ID・チャット本文・ユーザー名を含まない。外部送信も分析 SDK もない。`fetch` は同梱ロケール JSON の読み込み 1 か所のみ。
- **ライブ・アーカイブ・チャット無しは別の状態。** 挙動を変えたら 3 つとも確認する。バグ報告テンプレートもこの区別で聞いている。
