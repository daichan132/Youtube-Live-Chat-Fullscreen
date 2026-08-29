# リリース Runbook

Chrome Web Store と Firefox Add-ons に新しいバージョンを出すまでの手順。

このプロジェクトのリリースは **2 段階の手動プロセス**で、main への merge では何も公開されない（`scripts/verify/check-release-workflow.mjs` がその契約を検査している）。

1. **Release candidate**（`cd.yml`）— ビルドし、検証し、実 YouTube に対する canary を回し、成功したら SHA-256 の proof 付きで draft release を作る。
2. **Publish proven release**（`publish.yml`）— その draft の資産をダウンロードしてハッシュを照合し、**再ビルドせずに**そのバイト列をストアへ提出する。

「一度証明したバイト列だけを公開する」がこのパイプラインの中心的な不変条件。壊れた候補を差し替える方法は存在しない。バージョンを上げて作り直す。

## 事前条件

### 1. main が緑であること

出したい変更がすべて main に入っていて、そのコミットで CI（`quality` / `package` / `browser-contracts` / `production-package-smoke`）が通っていること。

### 2. バージョンを上げて merge しておくこと

`package.json` の `version` が唯一の情報源で、WXT が manifest のバージョンをここから作る。タグ名も `v<version>`。

**これを忘れると、約 2 時間のジョブを canary まで走らせきったあとの最後で落ちる。** `cd.yml` は既存タグ `v<version>` が別のコミットを指していたら中止し、すでに publish 済みの release は上書きしない。直前のリリースと同じバージョンのままでは候補を作れない。

```bash
git log --oneline -1              # 出したいコミット
node -p "require('./package.json').version"
git tag --list 'v*' | sort -V | tail -3
```

### 3. ストア掲載文を変えたなら先に反映しておくこと

`docs/store-listing/*.md` は `yarn check` の中の `yarn store:check` で検証される。ただし **パイプラインが送るのは ZIP だけで、掲載文は送らない。** Chrome のダッシュボード側のテキストとスクリーンショットの更新は、リリース後の手作業として残る（後述の手順 6）。

### 4. 実ブラウザでの検証を済ませ、文言を用意しておくこと

`cd.yml` は **Chrome・Firefox・Opera の 3 つ**を実 YouTube 上で検証したという申告を必須入力として要求する。手順とコマンドは [実ブラウザ検証](verification-browser.md)。

```bash
yarn build
yarn verify:browser --port 9335 --url "https://www.youtube.com/watch?v=<live_video_id>"
yarn verify:overlay --port 9335     # 別ターミナル
```

Opera など Chromium 系は testing build と一時プロファイルで確認する（同じドキュメントの「Opera など Chromium 系ブラウザの fixture 検証」）。

検証したブラウザのバージョンとシナリオを控えておく。次の手順でそのまま貼り、**20 文字以上**でないと候補が拒否される。この文字列は proof ファイルに `real-browser-manual-attestation` ゲートの根拠として記録され、あとから中身を検証する仕組みはない。canary が `unavailable` に落ちた場合、このリリースにおける実 YouTube の証拠はこの文字列だけになる。曖昧に書かない。

> 例: `Chrome 141 / Firefox 145 / Opera 122 — live watch page, fullscreen overlay open+drag+resize, archive replay, no-chat video`

## 手順 5 — 候補を作る

Actions → **Release candidate** → Run workflow。

- Branch: **main**（他の ref は即座に失敗する）
- `real_browser_verified`: **true**
- `real_browser_evidence`: 手順 4 で控えた文字列

このワークフロー自体には environment による承認ゲートがない。dispatch できる人はタグを push して draft を作れる。

`verify-and-package` ジョブ（timeout 120 分）が順に実行する内容:

```
yarn locales:check
yarn check                      # 4 つの契約スクリプトを含む
yarn test:coverage
yarn test:contracts
yarn build && yarn build:firefox && yarn zip && yarn zip:firefox
yarn verify:package-contracts
yarn build:e2e
playwright test --project=fixture --project=visual --project=accessibility --retries=0 --max-failures=1
yarn e2e:production:chrome      # 本番 Chrome ZIP を展開して bridge 無しで起動
playwright test --project=canary --retries=0 --max-failures=1   # ↑で展開した本番 ZIP に対して
```

`e2e:production:chrome` は `.output/production-smoke/chrome` を作る副作用を持ち、canary はそのディレクトリを見る。この 2 ステップの順序を入れ替えたり片方を消したりすると、「canary が本番 ZIP そのものに対して走った」という保証が黙って失われる。

### canary の判定

`scripts/verify/classify-release-canary.mjs` の分類:

| 結果 | 条件 | 候補は |
| --- | --- | --- |
| `passed` | 全件実行・失敗 0・skip 0 | 進む |
| `unavailable` | **全件 skip**（executed 0） | **進む**（proof のゲートは `unavailable` として記録される） |
| それ以外 | 一部 skip、flaky、fingerprint drift、失敗 | throw して**その場で停止**。タグも draft も作られない |

`unavailable` が通ることは意図的な設計だが、意味を理解しておく必要がある。**実 YouTube のテストが 1 件も実行されないままリリースが署名される。** その場合の実 YouTube 証拠は手順 4 の申告だけになる。ライブ配信やアーカイブは YouTube 側の都合で消えるので、コードとは無関係にこの状態になりうる。

厳格化するフラグは今のところ存在しない（`YLC_CANARY_REQUIRE_CLEAN` は `e2e/reporters/canarySummary.ts` で読まれているが、リポジトリ内のどこからも設定されていない）。許容できないときは時間を置いて再 dispatch する。

### 成功したら

`release-proof.mjs create` が `.output/release-proof-v<version>.json` を書く。中身はソースコミット、3 つの ZIP の SHA-256 とバイト数、7 つのゲート、不変条件。

`draft-release` ジョブが annotated タグ `v<version>` を作って push し、`gh release create ... --draft --generate-notes --verify-tag` で draft release に 4 つの資産（chrome / firefox / sources の ZIP と proof）を添付する。

診断は `release-candidate-browser-<sha>` アーティファクトに 14 日間残る。

## 手順 6 — リリースノートを書く

draft の本文は GitHub の自動生成（コミット一覧）になっている。**`.github/RELEASE_TEMPLATE.md` を自動で適用する仕組みはない。** 使いたければ draft を編集して手で貼る。

4 つの資産がすべて添付されていることを確認する。

## 手順 7 — ストアへ昇格する

Actions → **Publish proven release** → Run workflow。

- `version`: **先頭の `v` を付けない**素の semver（例: `2.3.16`）

`validate-candidate` が、タグ `v<version>` を checkout し、`package.json` のバージョン一致を確認し、**release がまだ draft であること**を確認し、資産をダウンロードしてハッシュとコミットを照合する。ここで 1 バイトでも違えば中止する。

そのあと 2 つのジョブが並列で走る。

| ジョブ | environment | 何をするか |
| --- | --- | --- |
| `publish-chrome` | `chrome-web-store` | `scripts/cws-v2-submit.mjs` が ZIP をアップロードし、審査へ提出する |
| `publish-firefox` | `firefox-add-ons` | `publish-browser-extension` が firefox ZIP と sources ZIP を提出する |

environment に required reviewers が設定されていれば、それぞれ run のページで承認する。**YAML に environment 名を書いただけでは承認は発生しない。** リポジトリの Settings → Environments で reviewer を設定していない場合、この 2 つは素通りする。

両方成功したあとに `publish-github-release` が `gh release edit v<version> --draft=false --latest` を実行して、GitHub release を公開する。

必要な secret:

- Chrome: `CHROME_EXTENSION_ID`, `CHROME_PUBLISHER_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, そして `REFRESH_TOKEN`（**この名前**。ワークフロー内で `CHROME_REFRESH_TOKEN` にマップされる）
- Firefox: `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET`

## 手順 8 — 提出後にやること

ワークフローが完了しても公開は完了していない。Chrome は CWS の審査待ち、Firefox は AMO の審査待ちで、どちらも結果はワークフローに返ってこない。

掲載文を変えていた場合は、Chrome のダッシュボードで手作業で反映する。そのあとスナップショットを更新しないと `yarn store:check --snapshot` が差分を報告し続ける。

## うまくいかなかったとき

**canary が degraded（一部実行・一部 skip、flaky、drift）**
候補ジョブが canary ステップで停止し、タグも draft も作られない。override 入力はない。job summary の "Real YouTube canary" テーブルと `release-candidate-browser-<sha>` アーティファクトを見て、互換性の退行なら直す。YouTube 側の都合なら時間を置いて再 dispatch する。

**canary が unavailable（全件 skip）**
候補は通る。手順 4 の申告がそのリリース唯一の実 YouTube 証拠になる。許容できないなら再 dispatch する。

**publish が片方だけ失敗した（例: Chrome は提出済み、Firefox が失敗）**
`publish-github-release` は走らず、GitHub release は draft のまま残る。`validate-candidate` は draft であることを要求するので、**draft のうちなら**再 dispatch できる。すでに publish 済みの release に対しては新しいバージョンを出すしかない。

**候補そのものが間違っていた**
`publish.yml` での再ビルドは禁止されていて `check-release-workflow.mjs` が検査している。バージョンを上げて候補を作り直す。

## 関連する仕組み

**日次 canary**（`canary.yml`、cron `0 18 * * *` = 18:00 UTC / 翌 03:00 JST）は独立した監視で、リリースを一切ゲートしない。CI 上では retry 2 回、degraded でも緑のままにして、YouTube 側の揺らぎによる誤検知を抑えている。厳格な判定をするのはリリースレーンだけ。

**`scripts/verify/check-release-workflow.mjs`** は `yarn check` の中で `cd.yml` と `publish.yml` の形そのものを検査している。`on:` ブロックの整形やステップ名の変更でもローカルの `yarn check` が落ちうる。ワークフローを編集したらこのスクリプトも一緒に更新する。
