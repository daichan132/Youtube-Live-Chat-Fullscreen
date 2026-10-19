# リリース Runbook

Chrome Web Store と Firefox Add-ons に新しいバージョンを提出する手順。リリースは 2 段階の手動プロセスで、main への merge では公開されない。

| ワークフロー | 役割 |
| --- | --- |
| [Release candidate](../../.github/workflows/cd.yml) | ビルドと検証を行い、ZIP の SHA-256 とソースコミットを記録した draft release を作る |
| [Publish proven release](../../.github/workflows/publish.yml) | 成功した候補 run の変更不能な Actions artifact を照合し、再ビルドせずに同じ ZIP をストアへ提出する |

実行コマンドは [`package.json`](../../package.json)、公開の制約は [`check-release-workflow.mjs`](../../scripts/verify/check-release-workflow.mjs) を参照する。この文書の更新だけではワークフローは実行されない。

## 1. main とバージョンを確認する

公開したい変更を main にまとめ、対象コミットの PR CI（`quality`、`package`、`browser-contracts`）を確認する。CI の `workflow_dispatch` では visual と production package startup smoke も実行できる。候補作成は、同じ種類の決定的な検証を `yarn verify:release:ci` で改めて実行する。実 YouTube の可用性は候補作成の成否から分離する。

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

`verify-and-package` ジョブは Node.js 24、固定した Yarn、Playwright Chromium を用意し、`yarn verify:release:ci` を実行する。現在の順序は次のとおり。

1. `yarn verify`：locale・掲載文・書式・型・coverage・contracts
2. `yarn test:package`：Chrome / Firefox ZIP と package 契約
3. `yarn verify:firefox-source`：ソース ZIP からの Firefox 再構築と一致確認
4. testing build と決定的な fixture・visual・accessibility
5. `yarn e2e:production:chrome`：本番 Chrome ZIP を展開し、test bridge なしで起動

実 YouTube canary は候補 CI の必須ゲートに含めない。GitHub の IP に対する bot 判定で、製品の不具合と無関係に候補を作れなくなるため。ZIP の確認や決定的なテストを省略する変更ではない。

`yarn verify:firefox-source` は `package.json.version` に対応する `.output/youtube-live-chat-fullscreen-<version>-sources.zip` を選ぶ。旧版の ZIP が同じディレクトリに残っていても検証できる。現在版の ZIP がなければ、旧版を代用せずに停止する。

production smoke は `.output/production-smoke/chrome` を作る。ローカルで `yarn e2e:canary:production` を実行すると、canary は `YLC_EXTENSION_OUTPUT_DIR` でそのディレクトリを読み、`YLC_REQUIRE_E2E_BRIDGE=0` で実行する。この順序と参照先を変えると、本番 ZIP に対する確認にならない。

### canary の判定

判定は [`canarySummary.ts`](../../e2e/reporters/canarySummary.ts) が行う。`yarn e2e:canary:production` は `YLC_CANARY_REQUIRE_CLEAN=1` を設定し、retry は 0 回。`yarn verify:release` は候補用の全検証にこの実サイトテストを加えたローカル用コマンド。

| 結果 | 条件 | strict canary コマンド |
| --- | --- | --- |
| `passed` | 実行あり、失敗・skip・flaky・互換性 drift なし | 成功 |
| `degraded` | 一部 skip、flaky、互換性 drift | 停止 |
| `failed` | テスト失敗または run の失敗 | 停止 |
| `not-run` | 全件 skip などで実行 0 件 | 停止 |

全件 skip は成功扱いしない。bot 判定時もテスト結果は `not-run` のまま残す。独立した **Real YouTube canary** の summary と診断を読み、外部条件と拡張の不具合を分ける。bot 判定に対する自動再試行の増加や認証情報の CI への持ち込みは行わない。

候補 CI の成功だけでは公開可能とは判断しない。公開前に、その Actions artifact の ZIP を使って Chrome と Firefox の実サイト確認を実施する。ログインが必要な購入 UI も購入・送信を確定する直前まで確認し、確認結果、未確認の経路、ZIP ハッシュ、artifact ID を記録する。実サイトで未解決の不具合があれば公開を止める。

### 候補の成果物

成功すると [`release-proof.mjs`](../../scripts/verify/release-proof.mjs) が `.output/release-proof-v<version>.json` を作る。schema version 3 には次が入る。

- バージョン、ソースコミット、作成日時
- Chrome ZIP、Firefox ZIP、Firefox ソース ZIP の名前・サイズ・SHA-256

この JSON 自体はテスト結果や実機確認を収集しない。検証の成功は候補ワークフローのログ、手動で確認した範囲はリリースの記録で確認する。

候補は `release-candidate-<run_id>-<run_attempt>` という Actions artifact に保存される。run の再実行は attempt ごとに別の artifact を作る。公開時は指定した run の最新の成功 attempt を照合するため、再実行した場合はその候補で実機確認をやり直す。

`draft-release` ジョブが annotated タグ `v<version>` と draft release を作り、3 つの ZIP と proof の計 4 ファイルを添付する。同じコミットの既存 draft に対する再実行は、ワークフローが成果物を再添付する。公開済み release は置き換えられない。draft の添付と proof は書込権限で差し替えられるため、これらだけで候補の出所を証明することはできない。公開の入力には元の Actions artifact を使う。

## 4. 候補とリリースノートを確認する

4 ファイルが添付され、ソースコミットとハッシュが一致することを確認する。実機確認には候補の ZIP を使い、ローカルで新しくビルドした出力に置き換えない。

Chrome ZIP は展開先を `yarn verify:browser --extension /path/to/extracted/chrome` で指定できる。Firefox の候補も Firefox 本体に読み込み、確認記録を draft のリリースノートや関連する作業記録に残す。

draft 本文は GitHub の自動生成。必要に応じて [リリースノートのテンプレート](../../.github/RELEASE_TEMPLATE.md) を手で適用し、利用者に伝わる変更と未確認の範囲を補う。

## 5. ストアへ提出する

Actions → **Publish proven release** → Run workflow で Branch に **main**、`version` に先頭の `v` を付けない semver、`candidate_run_id` に確認した **Release candidate** の成功 run ID を入力する。さらに `reviewed_artifact_id` に実機確認した候補の Actions artifact ID、`browser_review_url` に HTTPS の確認記録 URL を入力し、`browser_review_confirmed` を明示的に true にする。artifact ID は run ID とは別の数値で、Actions の artifact 情報から取得する。候補を再実行したら新しい artifact を再確認する。確認記録に URL・チャット本文・ユーザー名等の個人情報を含めない。

これは実施者の申告を必須にするゲートで、リンク先の内容や実機確認の実施を自動で証明するものではない。確認していない状態で true にしない。

run ID は候補 run の URL `/actions/runs/<run_id>` の数値。別の branch やタグからの公開実行は拒否する。

`validate-candidate` は公開操作を開始した main の固定コミットから検証コードを読み込む。タグのコードは検証前に実行しない。[`release-candidate.mjs`](../../scripts/verify/release-candidate.mjs) が読み取り専用の GitHub API で次を確認する。

このジョブの token は `contents: write` と `actions: read` を持つ。GitHub は push 権限のない token に draft Release を返さないため、公開前の draft 確認には Contents の書込権限が必要になる（[GitHub の仕様](https://docs.github.com/en/rest/releases/releases#list-releases)）。検証処理自体は Release を変更せず、Actions のメタデータも読み取り専用で扱う。ワークフロー全体の既定権限とストア提出ジョブの Contents 権限は読み取り専用のまま。

- `v<version>` のコミットが検証元 main の履歴に含まれ、その `package.json` のバージョンが一致する
- run が同じリポジトリの `cd.yml` に属し、fork ではなく main の `workflow_dispatch` で成功・完了している
- run のソースコミットがタグのコミットと一致する
- 現在の run attempt に対応する artifact が一つだけあり、期限内で、出所の run・コミット・リポジトリと SHA-256 digest が確認できる

照合した artifact ID でダウンロードし、GitHub が記録した digest と異なる場合は停止する。artifact 内の proof のコミット、指定バージョン、3 つの ZIP のサイズと SHA-256 を追加で照合し、`release-browser-review.mjs` が確認申告・記録 URL・照合済み artifact ID と確認対象 ID の一致を検査してから、同じ 4 ファイルを公開 run 内の新しい固定 artifact としてストア提出ジョブへ渡す。draft の添付をダウンロードする代替経路はない。提出コードも検証済みの候補コミットを SHA で checkout するため、検証後にタグを変更してもコードの参照先は変わらない。

| ジョブ | environment | 提出方法 |
| --- | --- | --- |
| `publish-chrome` | `chrome-web-store` | [`cws-v2-submit.mjs`](../../scripts/cws-v2-submit.mjs) で Chrome ZIP をアップロードし、提出する |
| `publish-firefox` | `firefox-add-ons` | WXT の `submit:firefox` で Firefox ZIP とソース ZIP を提出する |

environment に required reviewers が設定されている場合は run のページで承認する。YAML に environment 名があるだけでは承認は発生しないため、必要な承認は Settings → Environments の設定も確認する。

必要な secret は次のとおり。

- Chrome：`CHROME_EXTENSION_ID`、`CHROME_PUBLISHER_ID`、`CHROME_CLIENT_ID`、`CHROME_CLIENT_SECRET`、`REFRESH_TOKEN`。最後の値はワークフロー内で `CHROME_REFRESH_TOKEN` に渡される。
- Firefox：`FIREFOX_JWT_ISSUER`、`FIREFOX_JWT_SECRET`

両方の提出ジョブが成功すると `publish-github-release` が同じ検証済み artifact から draft の 4 添付を置き換えて公開する。GitHub の Release・タグの書込権限や、公開後の添付の変更制限は別の管理境界になる。main の保護と environment の実行可能 branch・承認設定もリポジトリ設定で維持する。ストア提出の成功と、ストアで利用者が更新を取得できる状態は別に確認する。

## 6. 提出後の確認

Chrome Web Store と Firefox Add-ons の審査・配信状態を各ダッシュボードと公開ページで確認する。ワークフローが緑であることだけで、ストアへの配信完了とは判断しない。

掲載文と画像を変更した場合はダッシュボードで手動更新する。`yarn store:check --snapshot` は保存済みのダッシュボード snapshot と原稿を比較する補助で、表示差分は情報として報告される。公開ページを確認してから snapshot を更新する。

## 失敗したとき

| 状況 | 対応 |
| --- | --- |
| canary が `degraded` / `failed` / `not-run` | summary と診断を読み、配信側の前提か拡張の問題かを確認する。製品不具合は修正する。外部条件なら別の利用可能な対象やローカル環境で同じ候補を確認し、結果を記録する。未確認を合格にしない |
| ストア提出が片方だけ失敗 | GitHub release は draft のまま。成功した側の提出状態を確認し、再提出の影響を把握してから再実行する |
| proof のコミット・サイズ・ハッシュが不一致 | 成果物を手で差し替えず、候補のソースと添付を確認する。ソース変更が必要なら新しいバージョンの候補を作る |
| artifact が期限切れ・削除済み、または古い命名規則の候補しかない | 現在の候補ワークフローを main から実行し直し、新しい run ID と artifact で確認する。draft 添付への切替は行わない |
| failed jobs だけの再実行で最新 attempt の artifact がない | 候補は **Re-run all jobs** で全ジョブをやり直す。前 attempt の artifact に戻して公開しない |
| run の出所・成功状態・タグとの照合に失敗 | 指定 run ID とタグのコミットを確認する。タグや proof の手修正で検証を迂回しない |
| 同じバージョンがすでに公開済み | 新しいバージョンの候補を作る。公開済み release はこのワークフローで再提出できない |

## 独立した canary と契約チェック

[Real YouTube canary](../../.github/workflows/canary.yml) は手動実行の互換性確認で、リリースを自動で開始しない。その ref の本番 Chrome ZIP を作り、test bridge なし・retry 0 回の strict 判定で確認する。候補 run の ZIP 自体ではないので、特定候補の実機確認の代わりにはしない。実行 0 件や skip を含む結果は成功扱いしない。候補・公開ワークフローには依存しない。

`yarn check` は `check-release-workflow.mjs` を含み、手動実行、決定的な候補検証、候補ごとの実機確認申告、信頼する main と候補 run・artifact ID の照合、digest 不一致時の停止、再ビルド禁止などの公開契約を検査する。ワークフローを変更したら関連する契約テストとこの文書も更新する。
