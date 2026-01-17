# Playwright + Chrome Extension 検証メモ

Chrome 拡張を読み込んだ状態で YouTube を検証するときの手順・注意点をまとめる。

## 前提
- 拡張ビルドは `.output/chrome-mv3` を使用する
- 拡張ロードは `--disable-extensions-except` と `--load-extension` を使う

## すぐ使えるスクリプト例

```bash
node - <<'NODE'
const path = require('node:path');
const { chromium } = require('@playwright/test');

(async () => {
  const pathToExtension = path.resolve('.output/chrome-mv3');
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
  });
  const page = await context.newPage();
  await page.goto('https://www.youtube.com/watch?v=cbFPfG-tZlM', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  // ここから検証処理を追加
  await context.close();
})();
NODE
```

## よく使う検証パターン

### フルスクリーンのレイアウト計測
```js
const metrics = await page.evaluate(() => {
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  };
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    player: rect(document.querySelector('.html5-video-player')),
    ytdPlayer: rect(document.querySelector('ytd-player') || document.querySelector('#player')),
    fullBleed: rect(document.querySelector('#full-bleed-container')),
    chatContainer: rect(document.querySelector('#chat-container')),
    fullscreen: document.fullscreenElement
      ? document.fullscreenElement.tagName + '#' + (document.fullscreenElement.id || '')
      : null,
  };
});
console.log(metrics);
```

### チャット要素の存在確認
```js
const info = await page.evaluate(() => {
  const exists = (sel) => !!document.querySelector(sel);
  return {
    hasChatFrame: exists('#chatframe'),
    hasChatContainer: exists('#chat-container'),
    hasChatHeader: exists('ytd-live-chat-frame') || exists('ytd-live-chat-frame#chatframe'),
  };
});
console.log(info);
```

## 注意点
- 配信によっては `#chatframe` が出ない場合がある。`#chat-container` は出ても `dom-if` だけで空のことがある。
- DOM が揃う前に計測すると誤差が出るので、`waitForTimeout` か `waitForSelector('ytd-watch-flexy')` を挟む。
- `button.ytp-fullscreen-button` は DOM 上にあっても非表示なことがあるので、必要なら `hover` を挟む。

## Playwright の Chromium が起動できない時のチェック
- `./node_modules/.bin/playwright install chromium` を実行してブラウザを入れ直す
- `chromium.executablePath()` で Playwright が期待する実行ファイルを確認する

