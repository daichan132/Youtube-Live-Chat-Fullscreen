# 実ブラウザ検証

YouTube 上の実表示を確認するときは、基本は専用の Chrome for Testing を使う。ログイン済み UI を見る必要があるときだけ、通常の Google Chrome を専用プロファイルで起動する。

この文書は読み込んだビルドと実際に操作した範囲を記録するための手順。自動の fixture、production package smoke、実 YouTube canary の結果と、手動で確認した経路は分けて記録する。候補の作成からストア提出までの流れは [リリース Runbook](release-runbook.md) を参照する。

現在の候補ワークフローには手動検証の申告入力はない。配布候補の確認では ZIP のハッシュと対象コミットを照合し、下記の [確認記録](#配布候補ごとの確認記録) をリリースノートや関連する作業記録に残す。

## 基本手順

```bash
yarn build
yarn verify:browser --port 9335 --url "https://www.youtube.com/watch?v=<video_id>"
```

`verify:browser` は `.output/chrome-mv3` を読み込む。`.output/chrome-mv3-dev` は WXT dev server 前提で、単体ロードでは content script が入らないことがあるため、手動検証では使わない。

コマンドは起動したままにする。Computer Use を使う場合の対象アプリ名は `Google Chrome for Testing`。

`<video_id>` はその時点で再生でき、チャットが使える動画に置き換える。以前の sample や canary URL は配信終了・削除・年齢制限で使えなくなることがあるため、動画の再生とネイティブチャットを先に確認する。確認中は autoplay を止め、次の動画に切り替わっていないことも確かめる。

候補 ZIP を確認するときは、その ZIP を展開したディレクトリを `--extension /path/to/extracted/chrome` で指定する。`yarn build` で作った出力と候補 ZIP の展開先を混同しない。

## ログイン済み UI の検証

Google ログインが必要な UI は、通常の Google Chrome の専用プロファイルで確認する。[Google の公式案内](https://support.google.com/accounts/answer/7675428?hl=ja)では、自動制御されているブラウザからのログインが拒否される場合がある。初回ログインは次のように通常の Chrome を直接開き、ユーザー本人が行う。この間は debugging port を付けず、Playwright / CDP や他の自動操作を接続しない。

```bash
ylc_profile="$PWD/.cache/store-capture-google-chrome"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir="$ylc_profile" --no-first-run --no-default-browser-check \
  --new-window https://www.youtube.com/ &
ylc_chrome_pid=$!
```

ログインが終わったら、起動時に記録した PID と `--user-data-dir` の一致を確認し、その専用プロファイルの Chrome だけを終了する。Chrome 全体の終了や私用ウィンドウの操作は行わない。debugging port は起動済みのプロファイルに後から追加できないため、同じプロファイルで下記の検証コマンドを使って再起動する。認証済みプロファイルは保持し、Cookie やプロファイルを別のディレクトリへコピーしない。

production 出力の初回読み込みは次のコマンドで行い、開いた `chrome://extensions` から `.output/chrome-mv3` を Load unpacked する。

```bash
yarn build
yarn verify:chrome --setup-extension --port 9336 --profile "$ylc_profile" \
  --url "https://www.youtube.com/watch?v=<video_id>"
```

UI 調整中は dev 出力と起動中の WXT dev server を使う。同じログイン状態を使う場合は `verify:dev` にも `--profile "$ylc_profile"` を指定する。

```bash
yarn dev
yarn verify:dev --port 9336
```

`verify:chrome` は `/Applications/Google Chrome.app` を直接起動し、Playwright の自動化 Chrome は使わない。通常 Chrome の headed / headless とも、そのブラウザ本来の User-Agent を保持する。プロファイルは既定で `~/Library/Application Support/YLC Verify Chrome` に作られる。一度 YouTube / Google にログインすると次回以降もその状態を再利用できる。
`verify:dev` は `.output/chrome-mv3-dev` を対象にして、同名の別 path の拡張を成功扱いしない。`yarn dev` を先に起動して dev manifest を生成し、WXT dev server を動かしたまま使う。

通常の Google Chrome 137+ は `--load-extension` で unpacked extension を読み込まないため、初回だけ `chrome://extensions` で次を行う。

1. Developer mode をオンにする
2. Load unpacked を押す
3. UI 調整中は `.output/chrome-mv3-dev` を選択する

`verify:dev` はここで終了せず、dev 出力の拡張が読み込まれるまで待つ。さらに WXT dev server の WebSocket に接続できない場合は、別の localhost サーバーを誤って使わないように失敗する。読み込みを検出したら自動で検証用 YouTube URL を開く。待ち時間を変えたい場合は `--timeout-ms` を指定する。

CSS / content script を変更したあとは、`chrome://extensions` でこの拡張の reload を押してから YouTube ページを reload する。`--load-extension` やプロセス引数では、今の dev 出力が読み込まれている証明にはならない。

配布前の build 出力を確認したいときだけ、明示的に build 用の入口を使う。

```bash
yarn build
yarn verify:chrome --setup-extension --port 9336 --url "https://www.youtube.com/watch?v=<video_id>"
```

同じ `--port` の Chrome がすでに起動している場合は、指定した port と、起動コマンドが出力した `profileDir` が process args に一致する場合だけ再利用する。プロファイルは `--profile` で変更でき、既定の `~` は実際のホームディレクトリに展開される。一致しない場合は誤った Chrome を触らないために停止する。

Computer Use を使う場合の対象アプリ名は `Google Chrome` だが、同じアプリ名の普段使い Chrome と混ざりやすい。操作前に `verify:chrome` の出力にある `profileDir` と、表示中の URL が検証対象であることを確認する。

## Opera など Chromium 系ブラウザの fixture 検証

Chrome 以外の Chromium 系ブラウザで content script、fullscreen、チャット切替を確認するときは、testing build と専用の一時プロファイルを使う。

```bash
yarn build:e2e
YLC_BROWSER_EXECUTABLE_PATH="/path/to/browser" YLC_E2E_HEADED=1 \
  yarn playwright test --project=fixture e2e/scenarios/live/spaNavigation.fixture.spec.ts
```

`YLC_BROWSER_EXECUTABLE_PATH` 指定時は対象ブラウザ本来の User-Agent を維持し、Playwright 同梱 Chromium 用の `channel` と Chrome User-Agent override を適用しない。通常プロファイルや既存の拡張状態は再利用しない。

## 設定ファイルを使った起動と撮影

設定 UI を手で操作せず、開発用の対象ページに設定を適用できる。Node.js 24 から現行の設定ドメインを使い、指定した項目だけを一括保存して読み戻す。拡張本体に遠隔操作用の API は追加していない。

```bash
yarn build
yarn verify:browser --headless --port 9335 \
  --profile /private/tmp/ylc-debug-profile \
  --settings-file docs/store-assets/chrome-web-store/source/settings/transparent-live.json \
  --url "https://www.youtube.com/watch?v=<video_id>"
```

起動後も同じ開発用プロファイルの対象タブだけに設定を適用できる。`--target-id` は CDP target ID を指定する。省略時は `--url-includes` に合う YouTube watch / live ページが1件だけでなければ停止する。

```bash
yarn verify:settings --port 9335 --profile /private/tmp/ylc-debug-profile \
  --target-id <target_id> \
  --settings-file docs/store-assets/chrome-web-store/source/settings/transparent-live.json

yarn verify:screenshots --background --video-only --require-composer --viewport 1600x900 --port 9335 \
  --profile /private/tmp/ylc-debug-profile --target-id <target_id> \
  --out /private/tmp/ylc-background-capture
```

背景撮影は対象タブの描画 surface を直接取得する。headless Chrome は OS ウィンドウを作らず、対象タブを内部で選択して YouTube の本来の全画面ボタンを操作する。headless 起動の viewport は 1600 × 900。全画面 DOM・拡張 overlay・復号された動画の寸法が成立しなければ失敗とする。`--require-composer` は可視かつ編集可能なネイティブ入力欄を要求し、ログイン案内やリプレイを成功扱いしない。headed Chrome の背面タブでは、フォーカスのエミュレーションだけで全画面に入れない場合があるため、同じ保証はない。既存の対話用5枚撮影は `--background` を付けずに使う。

撮影寸法を固定する場合は `--viewport 1600x900` を指定する。起動時の viewport だけでは全画面への移行後も高さ 900 px を維持できるとは限らない。撮影コマンドはネイティブ全画面に入ったあと、スクリーンショットを取得する同じ CDP session で指定寸法を適用し、撮影後に解除する。指定寸法が保持されなければ画像を採用しない。

設定 JSON は `enabled`、`theme`、`locale`、`profile`（appearance / display の部分更新）、`geometry`（player 相対の完全な矩形）を受け付ける。色は `backgroundColor: { "a": 0.22 }` のように alpha だけを指定できる。コメント入力欄を含める場合は `contentMode: "full-chat"` を指定する。サンプルは [撮影用設定](../store-assets/chrome-web-store/source/settings/) にある。

対象の unpacked path・拡張 ID・有効状態を確認し、実際の content script の isolated world だけで保存する。`storage.clear()` は使わず、未指定の現行設定とプリセットを保持する。破損した現行設定や旧形式だけの appearance は上書き前に拒否する。設定の読み戻し成功は描画成功の証明とは別で、背景色・配置・入力欄は撮影結果でも確認する。

通常の Google Chrome でも `verify:chrome --settings-file ...` / `verify:dev --settings-file ...` を使える。専用プロファイルへの unpacked 初回読み込みは従来どおり必要。ログインと読み込みが済んだ headed Chrome を、その PID とプロファイルを確認して終了したあと、同じ `--profile` を指定して `verify:chrome --headless --settings-file ...` で再起動できる。同じプロファイルを headed / headless で同時起動せず、headless と初回 `--setup-extension` は併用しない。保存済みの認証状態を使い、ログイン拒否や bot 判定が出たらその経路を停止して外部前提として記録する。判定を回避するためのブラウザ識別情報の変更や Cookie の移植は行わない。

普段の Chrome データディレクトリは拒否する。指定したプロファイルと CDP listener の process args が一致しない場合も接続前に停止する。私用プロファイルや Cookie のコピーは行わない。headless / background は認証や外部サイトの条件を回避する手段ではない。

オフラインで設定投入と背景撮影の接続を検証する場合は `yarn verify:background-capture` を使う。production 拡張を一時プロファイルで起動し、1600 × 900 の実全画面・入力欄・透過の合成ピクセル・フォーカスの復元を確認する。この fixture の成功は実 YouTube の再生やログインの成功とは分けて記録する。

## 状態確認

別ターミナルで次を実行する。

```bash
yarn verify:overlay --port 9335
```

非フルスクリーンでは overlay が未生成でも正常。フルスクリーンに入ったあとに再実行すると、`data-ylc-resizable`、`data-ylc-control-rail`、drag handle、settings button の座標と表示状態を JSON で確認できる。
フルスクリーン中に拡張 DOM が見つからない場合は `extensionDomMounted: false` を出して非ゼロ終了する。このコマンドの `extensionDomExpected` は fullscreen だけで決まり、チャットの利用可否を判定しない。チャットなし動画や replay が使えないアーカイブでは、拡張 DOM がなくても正常なため、この結果だけで読み込み失敗とは判断しない。チャットが使える対象で期待した UI がない場合に、読み込んだ拡張と path、ページの reload、診断を確認する。非フルスクリーンでは `extensionDomExpected: false` なので、拡張 DOM が無くても正常。

`verify:overlay` は既定で URL に `youtube.com/watch` を含むタブを探す。候補が1件だけの場合に検査し、複数ある場合は停止する。`--target-id <target_id>` を指定すると、その CDP target ID のタブを検査する。明示した ID が空または欠落していれば接続前に停止し、URL による選択へ戻らない。`/live` 入口を確認するときは `--url-includes youtube.com/live/` などで対象を明示し、実際の URL と動画が意図したものか確認する。検査は既存タブを前面に移したり閉じたりしない。

対象選択だけをオフラインで確認するには `node scripts/verify/inspect-overlay.browser-test.mjs` を使う。一時プロファイルと複数の合成ページで、単一候補、複数候補の拒否、ID 指定、既存タブとフォーカスの保全を確認する。拡張のインストールや描画を確認するテストではない。

ログイン済み UI を通常 Google Chrome で見ている場合は、同じ検証 Chrome の CDP port を指定する。

```bash
yarn verify:overlay --port 9336
```

## スクリーンショット検証

実表示の証跡を残すときは、`verify:browser` を起動したまま別ターミナルで次を実行する。

```bash
yarn verify:screenshots --port 9335 --out /private/tmp/ylc-overlay-screenshots
```

このコマンドは実ブラウザ上で fullscreen button をクリックし、overlay の非ホバー、ホバー、ドラッグ後、下端寄せ hover 後の PNG と `summary.json` を保存する。保存先は `--out` で指定し、未指定なら `/private/tmp/ylc-overlay-screenshots-*` を使う。

ログイン済み UI を通常 Google Chrome で撮る場合は `--port 9336` を使う。

## 見るポイント

利用可能なチャットがある動画で、表示を有効にしてフルスクリーンに入った状態を確認する。チャットなし動画や表示をオフにした状態では、overlay がないことは正常であり、以下の条件は適用しない。

- `fullscreen: true`
- `extensionDomExpected: true`
- `extensionDomMounted: true`
- `overlayMounted: true`
- `elements.controlRail.opacity` がホバー時に `1`
- `elements.controlRail.pointerEvents` がホバー時に `auto`
- `elements.controlRail.background` に背景色が入っている
- drag handle と settings button が重ならず、両方を操作できること（左右の順序は LTR / RTL で異なる）

検証が終わったら `verify:browser` を起動したターミナルで `Ctrl+C` する。

## 配布候補ごとの確認記録

`release-proof.mjs` のコミット・成果物名・SHA-256を次の記録に転記する。同じバージョンでもハッシュが違う成果物には確認結果を流用しない。ハッシュ照合は動作確認とは別の証拠として扱う。

```text
確認日時:
コミット:
成果物名 / SHA-256:
ブラウザー / バージョン:
OS / バージョン:
ライブ: 成功 / 失敗 / 未確認
リプレイ: 成功 / 失敗 / 未確認
チャットなし: 正常（非表示） / 失敗 / 未確認
全画面解除・再入場: 成功 / 失敗 / 未確認
SPA 遷移: 成功 / 失敗 / 未確認
設定（Tab到達・閉じた後のフォーカス）: 成功 / 失敗 / 未確認
配置（ドラッグ・ボタン移動・拡縮）: 成功 / 失敗 / 未確認
ポップアップ（有効切替・設定の読み込み／書き出し）: 成功 / 失敗 / 未確認
問題・再現手順・匿名化済み診断:
```

Chrome と Firefox はそれぞれの成果物について記録する。Firefox の主要経路は Firefox 本体で確認し、Chromium fixture や ZIP 検査の成功で代用しない。未実施の経路は「未確認」と記す。この記録をリリース候補の既存の検証記録へ添付する。

表示に問題がある場合は、[トラブルシューティング](../troubleshooting.md) の手順で再読み込み後の動作も確認する。

## 性能の比較測定

production ビルドを専用の一時プロファイルに読み込み、同じ実機の Chrome for Testing で比較する。

```bash
yarn build
node scripts/verify/measure-performance.mjs --out /private/tmp/ylc-performance-after.json
```

変更前に保存したビルドは `--extension /path/to/saved/chrome-mv3` で指定する。測定は外部ネットワークを遮断した YouTube fixture 上で行い、1,000件のメッセージを保持して100回の追加・削除と100回の player 通知を5セット実行する。入力欄はメッセージ一覧の後に置き、`--chrome panel`（既定）、`--chrome fallback`（ログイン案内）、`--chrome absent`（ヘッダー・入力欄なし）を同じ条件で比較できる。実 YouTube の互換性確認は上記の実ブラウザ手順で別に行う。

JSON にはブラウザ・OS・拡張パス・content script の SHA-256 と次の処理回数を保存する。

- `bodyQueries`、`descendantQueries`、`selectorMatches`: iframe の body・子要素を起点とする検索と selector 判定。
- `bodyTextReads`: iframe の `body.textContent` 読み出し。メッセージ本文を含む全文取得の発生を追う。
- `iframeDocumentQueries`、`topDocumentQueries`: iframe・動画ページの Document を起点とする検索。
- `topElementQueries`、`topSelectorMatches`、`topRectReads`: 動画ページの要素検索、selector 判定、`getBoundingClientRect()`。
- `iframeComputedStyleCalls`: iframe 要素を対象とする `getComputedStyle()`。
- `cssWrites`: iframe の html・body に対する `style.setProperty()`。

カウンターは読み込まれた拡張 ID の isolated world に取り付け、両 Document・Element realm と `Node.textContent`、MutationObserver から受け取る node wrapper 上で動作することを自己検証する。Document・body を起点とする検索でもブラウザの最適化があるため、毎回全ノードを走査するとは限らない。`topRectReads` は読み出し回数で、強制 layout の発生回数とは異なる。CSS カウンターも個別のヘッダー・入力欄への style 設定を含まない。

固定サイズの player controls 内の子要素が変わる負荷は、`--workload controls` で別に測定する。`.ytp-chrome-bottom` の子に style と Text node の更新を100回加え、`autoControls` にトップ要素の矩形読み出し回数と処理時間を記録する。測定プロファイルには `DEFAULT_CHAT_GEOMETRY` の `pinned: false` を明示的に保存する。counter 使用時は事前に controls の子を一度更新し、`controlsPrecondition.topRectReads` が正であることを確認して、自動配置の監視が有効な状態だけを測る。既定の `--workload chat` は従来のチャット負荷と player 通知を維持し、`--workload all` は両方を実行する。同じ script、workload、chrome shape、instrumentation で変更前後のビルドを比較する。

```bash
node scripts/verify/measure-performance.mjs --extension /path/to/saved/chrome-mv3 --workload controls --out /private/tmp/ylc-controls-before.json
node scripts/verify/measure-performance.mjs --workload controls --out /private/tmp/ylc-controls-after.json
```

CDP の `TaskDuration`、`ScriptDuration`、`LayoutDuration`、`RecalcStyleDuration` は秒、`LayoutCount` と `RecalcStyleCount` は回数、描画間隔はミリ秒で記録する。処理時間には fixture がメッセージや controls を更新する負荷も含まれ、拡張だけの CPU 時間を表す値ではない。CPU 時間や描画間隔は他のアプリやディスプレイの影響を受けるため、処理回数の削減だけから体感速度の改善率を推定しない。

カウンター自身にも呼び出し回数に応じた負荷がある。処理時間を比較するときは `--instrumentation none` でも同じ組を測定する。このモードの JSON は処理回数を含まず、プロトタイプや CSS メソッドを書き換えない。

メンバーシップ名の色は `--membership-color youtube-default`（既定）と `--membership-color custom` で切り替える。custom は固定の `{ r: 12, g: 34, b: 56, a: 0.8 }` を保存し、JSON の `membershipColor` に選択モードを記録する。同じモードで変更前後を比較し、custom 時の player 通知に伴う不要な computed style 取得を `repeatedSignals.iframeComputedStyleCalls` で確認できる。
