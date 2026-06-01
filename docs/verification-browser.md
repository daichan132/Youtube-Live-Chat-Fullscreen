# Browser Verification

YouTube 上の実表示を確認するときは、通常の Chrome プロファイルではなく専用の Chrome for Testing を使う。

## 基本手順

```bash
yarn build
yarn verify:browser --port 9335 --url "https://www.youtube.com/watch?v=EWrX250Zhko"
```

`verify:browser` は `.output/chrome-mv3` を読み込む。`.output/chrome-mv3-dev` は WXT dev server 前提で、単体ロードでは content script が入らないことがあるため、手動検証では使わない。

コマンドは起動したままにする。Computer Use を使う場合の対象アプリ名は `Google Chrome for Testing`。

## 状態確認

別ターミナルで次を実行する。

```bash
yarn verify:overlay --port 9335
```

非フルスクリーンでは overlay が未生成でも正常。フルスクリーンに入ったあとに再実行すると、`data-ylc-resizable`、`data-ylc-control-rail`、drag handle、settings button の座標と表示状態を JSON で確認できる。

## スクリーンショット検証

実表示の証跡を残すときは、`verify:browser` を起動したまま別ターミナルで次を実行する。

```bash
yarn verify:screenshots --port 9335 --out /private/tmp/ylc-overlay-screenshots
```

このコマンドは実ブラウザ上で fullscreen button をクリックし、overlay の非ホバー、ホバー、ドラッグ後、下端寄せ hover 後の PNG と `summary.json` を保存する。保存先は `--out` で指定し、未指定なら `/private/tmp/ylc-overlay-screenshots-*` を使う。

## 見るポイント

- `fullscreen: true`
- `overlayMounted: true`
- `elements.controlRail.opacity` がホバー時に `1`
- `elements.controlRail.pointerEvents` がホバー時に `auto`
- `elements.controlRail.background` に背景色が入っている
- `elements.dragHandle.x` が `elements.settingsButton.x` より右側

検証が終わったら `verify:browser` を起動したターミナルで `Ctrl+C` する。
