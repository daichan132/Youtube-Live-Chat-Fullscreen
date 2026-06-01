# Browser Verification

YouTube 上の実表示を確認するときは、基本は専用の Chrome for Testing を使う。ログイン済み UI を見る必要があるときだけ、通常の Google Chrome を専用プロファイルで起動する。

## 基本手順

```bash
yarn build
yarn verify:browser --port 9335 --url "https://www.youtube.com/watch?v=EWrX250Zhko"
```

`verify:browser` は `.output/chrome-mv3` を読み込む。`.output/chrome-mv3-dev` は WXT dev server 前提で、単体ロードでは content script が入らないことがあるため、手動検証では使わない。

コマンドは起動したままにする。Computer Use を使う場合の対象アプリ名は `Google Chrome for Testing`。

## ログイン済み UI の検証

Google ログインが必要な UI は Chrome for Testing ではなく、通常の Google Chrome を使う。

```bash
yarn build
yarn verify:chrome --setup-extension --port 9336
```

`verify:chrome` は `/Applications/Google Chrome.app` を直接起動し、Playwright の自動化 Chrome は使わない。プロファイルは既定で `~/Library/Application Support/YLC Verify Chrome` に作られる。一度 YouTube / Google にログインすると次回以降もその状態を再利用できる。

通常の Google Chrome 137+ は `--load-extension` で unpacked extension を読み込まないため、初回だけ `chrome://extensions` で次を行う。

1. Developer mode をオンにする
2. Load unpacked を押す
3. `.output/chrome-mv3` を選択する

`--setup-extension` はここで終了せず、拡張が読み込まれるまで待つ。読み込みを検出したら自動で検証用 YouTube URL を開く。待ち時間を変えたい場合は `--timeout-ms` を指定する。

`yarn build` をやり直したあとは、`chrome://extensions` でこの拡張の reload を押してから検証する。`--load-extension` やプロセス引数では、今のビルドが読み込まれている証明にはならない。

拡張を読み込んだあとは、同じプロファイルを再利用して YouTube を開く。

```bash
yarn verify:chrome --port 9336 --url "https://www.youtube.com/watch?v=EWrX250Zhko"
```

同じ `--port` の Chrome がすでに起動している場合は、process args に `--remote-debugging-port=9336` と `--user-data-dir=~/Library/Application Support/YLC Verify Chrome` がある場合だけ再利用する。一致しない場合は誤った Chrome を触らないために停止する。

Computer Use を使う場合の対象アプリ名は `Google Chrome` だが、同じアプリ名の普段使い Chrome と混ざりやすい。操作前に `verify:chrome` の出力にある `profileDir` と、表示中の URL が検証対象であることを確認する。

## 状態確認

別ターミナルで次を実行する。

```bash
yarn verify:overlay --port 9335
```

非フルスクリーンでは overlay が未生成でも正常。フルスクリーンに入ったあとに再実行すると、`data-ylc-resizable`、`data-ylc-control-rail`、drag handle、settings button の座標と表示状態を JSON で確認できる。

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
- `overlayMounted: true`
- `elements.controlRail.opacity` がホバー時に `1`
- `elements.controlRail.pointerEvents` がホバー時に `auto`
- `elements.controlRail.background` に背景色が入っている
- `elements.dragHandle.x` が `elements.settingsButton.x` より右側

検証が終わったら `verify:browser` を起動したターミナルで `Ctrl+C` する。
