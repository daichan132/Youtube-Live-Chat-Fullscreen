# リリース Runbook

Chrome Web Store と Firefox Add-ons に新しいバージョンを提出する手順。リリースは 2 段階の手動プロセスで、main への merge では公開されない。

| ワークフロー | 役割 |
| --- | --- |
| [Release candidate](../../.github/workflows/cd.yml) | ビルドと検証を行い、ZIP の SHA-256 とソースコミットを記録した draft release を作る |
| [Publish proven release](../../.github/workflows/publish.yml) | draft の成果物を照合し、再ビルドせずに同じ ZIP をストアへ提出する |

実行コマンドは [`package.json`](../../package.json)、公開の制約は [`check-release-workflow.mjs`](../../scripts/verify/check-release-workflow.mjs) を参照する。この文書の更新だけではワークフローは実行されない。

## 1. main とバージョンを確認する

公開したい変更を main にまとめ、対象コミットの PR CI（`quality`、`package`、`browser-contracts`）を確認する。CI の `workflow_dispatch` では visual と production package startup smoke も実行できる。候補作成は、同じ種類の検証を `yarn verify:release` で改めて実行する。

`package.json` の `version` が WXT の manifest と成果物名の情報源。新しいリリースではバージョンを上げ、既存タグと公開済み release に衝突しないことを先に確認する。

```bash
git log --oneline -1
node -p "require('./package.json').version"
git ls-remote --tags origin 'refs/tags/v*'
```

候補ジョブは main 以外の ref を拒否する。既存タグ `v<version>` が別のコミットを指す場合や、同じバージョンの release が公開済みの場合も停止する。候補の最後まで進んでから気付かないよう、実行前に確認する。

## 2. 掲載内容と実機確認を準備する

掲載文を変更した場合は `yarn store:check` で原稿を確認する。これは `yarn verify` に含まれ、`yarn check` には含まれない。掲載文とストア画像は公開ワークフローが送信しないため、ダッシュボードでの更新作業も用意する。

実機の操作は [実ブラウザ検証](verification-browser.md) に沿って確認する。ライブ、アーカイブのリプレイ、チャットなし、全画面解除・再入場、SPA 遷移を分けて記録する。Chrome と Firefox の主要経路はそれぞれのブラウザで確認し、Opera の互換性を確認した場合も結果を記す。

現在の `cd.yml` には手動検証の申告入力はない。ローカル build の確認と、公開候補 ZIP の確認は区別し、候補作成後にその成果物を使って [配布候補ごとの確認記録](verification-browser.md#配布候補ごとの確認記録) を残す。未実施の経路は「未確認」と書く。

## 3. 候補を作る

Actions → **Release candidate** → Run workflow で Branch に **main** を指定する。追加の入力はなく、候補作成のジョブには environment の指定もない。成功するとタグと draft release が作られる。

`verify-and-package` ジョブは Node.js 24、固定した Yarn、Playwright Chromium を用意し、`yarn verify:release` を実行する。現在の順序は次のとおり。

1. `yarn verify`：locale・掲載文・書式・型・coverage・contracts
2. `yarn test:package`：Chrome / Firefox ZIP と package 契約
3. `yarn verify:firefox-source`：ソース ZIP からの Firefox 再構築と一致確認
4. testing build と決定的な fixture・visual・accessibility
5. `yarn e2e:production:chrome`：本番 Chrome ZIP を展開し、test bridge なしで起動
6. 展開した同じ本番 Chrome ZIP に対する実 YouTube canary

production smoke は `.output/production-smoke/chrome` を作る。canary は `YLC_EXTENSION_OUTPUT_DIR` でそのディレクトリを読み、`YLC_REQUIRE_E2E_BRIDGE=0` で実行する。この順序と参照先を変えると、本番 ZIP に対する確認にならない。

### canary の判定

判定は [`canarySummary.ts`](../../e2e/reporters/canarySummary.ts) が行う。release では `YLC_CANARY_REQUIRE_CLEAN=1` を設定し、retry は 0 回。

| 結果 | 条件 | 候補作成 |
| --- | --- | --- |
| `passed` | 実行あり、失敗・skip・flaky・互換性 drift なし | 続行 |
| `degraded` | 一部 skip、flaky、互換性 drift | 停止 |
| `failed` | テスト失敗または run の失敗 | 停止 |
| `not-run` | 全件 skip などで実行 0 件 | 停止 |

全件 skip を成功扱いする経路や、手動の申告で canary を迂回する入力はない。停止した場合は GitHub job summary の「Real YouTube canary」と `release-candidate-browser-<sha>` の診断を確認する。配信終了や replay の消失と、拡張の互換性問題を分けて判断する。

### 候補の成果物

成功すると [`release-proof.mjs`](../../scripts/verify/release-proof.mjs) が `.output/release-proof-v<version>.json` を作る。schema version 3 には次が入る。

- バージョン、ソースコミット、作成日時
- Chrome ZIP、Firefox ZIP、Firefox ソース ZIP の名前・サイズ・SHA-256

この JSON 自体はテスト結果や実機確認を収集しない。検証の成功は候補ワークフローのログ、手動で確認した範囲はリリースの記録で確認する。

`draft-release` ジョブが annotated タグ `v<version>` と draft release を作り、3 つの ZIP と proof の計 4 ファイルを添付する。同じコミットの既存 draft に対する再実行は、ワークフローが成果物を再添付する。公開済み release は置き換えられない。

## 4. 候補とリリースノートを確認する

4 ファイルが添付され、ソースコミットとハッシュが一致することを確認する。実機確認には候補の ZIP を使い、ローカルで新しくビルドした出力に置き換えない。

Chrome ZIP は展開先を `yarn verify:browser --extension /path/to/extracted/chrome` で指定できる。Firefox の候補も Firefox 本体に読み込み、確認記録を draft のリリースノートや関連する作業記録に残す。

draft 本文は GitHub の自動生成。必要に応じて [リリースノートのテンプレート](../../.github/RELEASE_TEMPLATE.md) を手で適用し、利用者に伝わる変更と未確認の範囲を補う。

## 5. ストアへ提出する

Actions → **Publish proven release** → Run workflow で `version` に先頭の `v` を付けない semver を入力する。

`validate-candidate` はタグ `v<version>` を checkout し、`package.json` のバージョン、draft 状態、proof のコミット、3 つの ZIP のサイズと SHA-256 を確認する。その後、照合済みの成果物を 2 つのジョブへ渡す。

| ジョブ | environment | 提出方法 |
| --- | --- | --- |
| `publish-chrome` | `chrome-web-store` | [`cws-v2-submit.mjs`](../../scripts/cws-v2-submit.mjs) で Chrome ZIP をアップロードし、提出する |
| `publish-firefox` | `firefox-add-ons` | WXT の `submit:firefox` で Firefox ZIP とソース ZIP を提出する |

environment に required reviewers が設定されている場合は run のページで承認する。YAML に environment 名があるだけでは承認は発生しないため、必要な承認は Settings → Environments の設定も確認する。

必要な secret は次のとおり。

- Chrome：`CHROME_EXTENSION_ID`、`CHROME_PUBLISHER_ID`、`CHROME_CLIENT_ID`、`CHROME_CLIENT_SECRET`、`REFRESH_TOKEN`。最後の値はワークフロー内で `CHROME_REFRESH_TOKEN` に渡される。
- Firefox：`FIREFOX_JWT_ISSUER`、`FIREFOX_JWT_SECRET`

両方の提出ジョブが成功すると `publish-github-release` が draft を公開する。ストア提出の成功と、ストアで利用者が更新を取得できる状態は別に確認する。

## 6. 提出後の確認

Chrome Web Store と Firefox Add-ons の審査・配信状態を各ダッシュボードと公開ページで確認する。ワークフローが緑であることだけで、ストアへの配信完了とは判断しない。

掲載文と画像を変更した場合はダッシュボードで手動更新する。`yarn store:check --snapshot` は保存済みのダッシュボード snapshot と原稿を比較する補助で、表示差分は情報として報告される。公開ページを確認してから snapshot を更新する。

## 失敗したとき

| 状況 | 対応 |
| --- | --- |
| canary が `degraded` / `failed` / `not-run` | summary と診断を読み、配信側の前提か拡張の問題かを確認する。修正または有効な対象を確認して候補を再実行する |
| ストア提出が片方だけ失敗 | GitHub release は draft のまま。成功した側の提出状態を確認し、再提出の影響を把握してから再実行する |
| proof のコミット・サイズ・ハッシュが不一致 | 成果物を手で差し替えず、候補のソースと添付を確認する。ソース変更が必要なら新しいバージョンの候補を作る |
| 同じバージョンがすでに公開済み | 新しいバージョンの候補を作る。公開済み release はこのワークフローで再提出できない |

## 独立した canary と契約チェック

[Real YouTube canary](../../.github/workflows/canary.yml) は手動実行の互換性確認で、リリースを自動で開始しない。testing build を使い、CI 上は retry 2 回。release の全件 clean 判定とは用途が異なるが、実行 0 件と失敗はこの経路でも成功扱いしない。

`yarn check` は `check-release-workflow.mjs` を含み、手動実行、clean canary、draft と成果物の照合、再ビルド禁止などの公開契約を検査する。ワークフローを変更したら関連する契約テストとこの文書も更新する。
