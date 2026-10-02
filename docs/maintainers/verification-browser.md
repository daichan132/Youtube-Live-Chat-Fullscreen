# 実ブラウザ検証

YouTube 上の実表示を確認するときは、基本は専用の Chrome for Testing を使う。ログイン済み UI を見る必要があるときだけ、通常の Google Chrome を専用プロファイルで起動する。

リリース候補ワークフローは Chrome・Firefox・Opera を実 YouTube 上で検証したという申告を必須入力にしている。ここに書いた手順がその証拠を作る手順で、貼り先は [リリース Runbook](release-runbook.md) の手順 4。

## 基本手順

```bash
yarn build
yarn verify:browser --port 9335 --url "https://www.youtube.com/watch?v=EWrX250Zhko"
```

`verify:browser` は `.output/chrome-mv3` を読み込む。`.output/chrome-mv3-dev` は WXT dev server 前提で、単体ロードでは content script が入らないことがあるため、手動検証では使わない。

コマンドは起動したままにする。Computer Use を使う場合の対象アプリ名は `Google Chrome for Testing`。

## ログイン済み UI の検証

Google ログインが必要な UI は Chrome for Testing ではなく、通常の Google Chrome を使う。UI 調整中は build ではなく dev 出力を使う。

```bash
yarn dev
yarn verify:dev --port 9336
```

`verify:chrome` は `/Applications/Google Chrome.app` を直接起動し、Playwright の自動化 Chrome は使わない。プロファイルは既定で `~/Library/Application Support/YLC Verify Chrome` に作られる。一度 YouTube / Google にログインすると次回以降もその状態を再利用できる。
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
yarn verify:chrome --setup-extension --port 9336 --url "https://www.youtube.com/watch?v=EWrX250Zhko"
```

同じ `--port` の Chrome がすでに起動している場合は、process args に `--remote-debugging-port=9336` と `--user-data-dir=~/Library/Application Support/YLC Verify Chrome` がある場合だけ再利用する。一致しない場合は誤った Chrome を触らないために停止する。

Computer Use を使う場合の対象アプリ名は `Google Chrome` だが、同じアプリ名の普段使い Chrome と混ざりやすい。操作前に `verify:chrome` の出力にある `profileDir` と、表示中の URL が検証対象であることを確認する。

## Opera など Chromium 系ブラウザの fixture 検証

Chrome 以外の Chromium 系ブラウザで content script、fullscreen、チャット切替を確認するときは、testing build と専用の一時プロファイルを使う。

```bash
yarn build:e2e
YLC_BROWSER_EXECUTABLE_PATH="/path/to/browser" YLC_E2E_HEADED=1 \
  yarn playwright test --project=fixture e2e/scenarios/live/spaNavigation.fixture.spec.ts
```

`YLC_BROWSER_EXECUTABLE_PATH` 指定時は、対象ブラウザ本来の User-Agent を維持し、Playwright 同梱 Chromium 用の `channel` と Chrome User-Agent override を適用しない。通常プロファイルや既存の拡張状態は再利用しない。

## 状態確認

別ターミナルで次を実行する。

```bash
yarn verify:overlay --port 9335
```

非フルスクリーンでは overlay が未生成でも正常。フルスクリーンに入ったあとに再実行すると、`data-ylc-resizable`、`data-ylc-control-rail`、drag handle、settings button の座標と表示状態を JSON で確認できる。
フルスクリーン中に拡張 DOM が見つからない場合は `extensionDomMounted: false` を出して非ゼロ終了する。これは検証 Chrome に unpacked extension が読み込まれていない、または YouTube ページを reload していない状態を示す。非フルスクリーンでは `extensionDomExpected: false` なので、拡張 DOM が無くても正常。

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

- `fullscreen: true`
- `extensionDomExpected: true`
- `extensionDomMounted: true`
- `overlayMounted: true`
- `elements.controlRail.opacity` がホバー時に `1`
- `elements.controlRail.pointerEvents` がホバー時に `auto`
- `elements.controlRail.background` に背景色が入っている
- `elements.dragHandle.x` が `elements.settingsButton.x` より右側

検証が終わったら `verify:browser` を起動したターミナルで `Ctrl+C` する。

## メッセージ更新時の負荷回帰

messages-only 表示のヘッダー・入力欄制御は、本文更新を高さ計測の対象にしない。入力欄などの更新は 1 animation frame にまとめ、展開・解除・iframe 差し替えで予約した計測をキャンセルする。

```bash
yarn build:e2e
yarn playwright test --project=fixture e2e/scenarios/live/overlayInteraction.fixture.spec.ts \
  --grep 'message and input bursts' --reporter=line
```

実際に拡張を読み込んだ Chromium 上で、120 バッチ・6,000 件の本文更新と、40 回の入力欄更新を実行する。`chat-chrome-work` 添付で本文更新時の chrome style 書き込みが 0、入力欄更新の書き込みが 4 以下であることを確認する。更新後も折り畳みからホバーによる展開ができ、入力欄の高さが戻ることを確認する。これは再現可能な fixture 検証で、実配信の CPU 使用率や FPS の測定とは別。

DOM 層の回帰は次のコマンドで確認できる。

```bash
yarn vitest run --project dom \
  entrypoints/content/runtime/chatOnlyChrome.spec.ts \
  entrypoints/content/runtime/chatChromeTraffic.dom.spec.ts
```

DOM テストでは本文更新時の全体・部分ツリー検索と chrome のレイアウト読み取りが 0、入力欄の連続更新時の高さ計測が各要素につき 1 回であることを検証する。テキストノード変更、wrapper ごとの差し替え、予約計測のキャンセルも対象。DOM テストは実ブラウザの描画性能や表示の確認を代替しない。
