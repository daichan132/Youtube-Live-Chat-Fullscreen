# Browser APIs — Chrome Extension E2E

page.evaluate()、chrome.storage、Shadow DOM、iframe の操作パターン。テストコードを書く・修正するときに参照する。

---

## page.evaluate() のスコープ

コールバックはブラウザプロセスで実行される。Node.js の変数は参照できない。TypeScript はこのエラーを検出しない。

```ts
// NG: 実行時に ReferenceError
const SEL = '#btn'
await page.evaluate(() => document.querySelector(SEL))

// OK: 引数で渡す
await page.evaluate((sel) => document.querySelector(sel), SEL)
```

### addInitScript で共通ヘルパーを注入する

テスト全体で使う DOM ユーティリティを `window` に注入。各 `page.evaluate()` でのコピペが不要になる。

```ts
export function registerHelpers(context: BrowserContext) {
  context.addInitScript(() => {
    ;(window as any).__e2e = {
      qs: (sel: string) => document.querySelector(sel),
      shadowQs: (host: string, inner: string) =>
        document.querySelector(host)?.shadowRoot?.querySelector(inner) ?? null,
      isVisible(el: Element | null): boolean {
        if (!el) return false
        const s = getComputedStyle(el)
        return s.display !== 'none' && s.visibility !== 'hidden'
      },
    }
  })
}

// fixture で1回呼ぶ → 全 spec から参照可能
await page.evaluate(() => window.__e2e.shadowQs('#host', '.target'))
```

### よくある失敗

- **ReferenceError が出るが TypeScript は警告しない**: 引数で渡すか addInitScript を使う
- **ヘルパーのコピペで 500行超に膨張**: addInitScript に切り替える

---

## chrome.storage へのアクセス

テストから `chrome.storage` を読み書きするには、拡張のコンテキスト（SW または拡張ページ）を経由する。

### 起動時分岐（boot-time bifurcation）

storage accessor のパスは **fixture 起動時に一度だけ決定** する。実行時にフォールバックチェーンを持たない設計が安定する。

```ts
// Worker パス: fixture 起動時に SW が取得できた場合
// CDP セッションが Worker 参照を keep alive するため、
// Chrome が SW を idle termination しても evaluate() は有効
const data = await worker.evaluate((k) => chrome.storage.local.get(k), keys)
await worker.evaluate((i) => chrome.storage.local.set(i), items)

// Page パス: SW が取得できなかった場合
// 操作のたびに拡張ページを開き、完了後に即閉じる
const popup = await context.newPage()
await popup.goto(`chrome-extension://${extensionId}/popup.html`)
const data = await popup.evaluate((k) => chrome.storage.local.get(k), keys)
await popup.goto('about:blank') // rehydration 遮断（後述）
await popup.close()
```

### ファクトリ関数でまとめる場合

```ts
type StorageAccessor = {
  get(keys?: string | string[] | null): Promise<Record<string, unknown>>
  set(items: Record<string, unknown>): Promise<void>
  clear(): Promise<void>
}

function createStorageAccessor(
  context: BrowserContext, extensionId: string, initialWorker: Worker | null
): StorageAccessor {
  // Worker パス: CDP が参照を keep alive するため直接使い続ける
  if (initialWorker) {
    return {
      get: (keys) => initialWorker.evaluate(
        (k) => chrome.storage.local.get(k), keys ?? null
      ),
      set: (items) => initialWorker.evaluate(
        (i) => chrome.storage.local.set(i), items
      ).then(() => {}),
      clear: () => initialWorker.evaluate(
        () => chrome.storage.local.clear()
      ).then(() => {}),
    }
  }

  // Page パス: 操作のたびに拡張ページを一時的に開く
  const popupUrl = `chrome-extension://${extensionId}/popup.html`
  const viaPopup = async <T>(fn: (page: Page) => Promise<T>): Promise<T> => {
    const page = await context.newPage()
    try {
      await page.goto(popupUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
      const result = await fn(page)
      await page.goto('about:blank') // rehydration 遮断
      return result
    } finally {
      await page.close().catch(() => null)
    }
  }

  return {
    get: (keys) => viaPopup(p => p.evaluate(
      (k) => chrome.storage.local.get(k), keys ?? null
    )),
    set: (items) => viaPopup(p => p.evaluate(
      (i) => chrome.storage.local.set(i), items
    ).then(() => {})),
    clear: () => viaPopup(p => p.evaluate(
      () => chrome.storage.local.clear()
    ).then(() => {})),
  }
}
```

**なぜ runtime fallback ではなく boot-time bifurcation か**: 実行時に「Worker を試す → 失敗 → Page にフォールバック」とすると、Page パスで拡張ページを開いたときに persist ミドルウェアの rehydration が走り、テストが書き込んだデータがデフォルト値で上書きされる。起動時に一度パスを決めれば、この問題が起きない。

### Persist ミドルウェアの地雷 (Redux Persist, Zustand persist 等)

1. **初回起動でキーが存在しない**: persist は `set()` 後にしか storage に書き込まない。persist フォーマット（例: `{ state: {...}, version: N }`）で直接書き込む
2. **拡張ページの rehydration**: popup.html を開くと React アプリがマウント → persist ミドルウェアが storage を読み取り → マージしたデフォルト値を書き戻す。テストが事前にセットしたデータが上書きされる。Page パスでは操作完了後に即 `about:blank` へ遷移して rehydration を遮断する
3. **async write レース**: `setState()` 後に即 `window.close()` すると書き込みが中断される。`chrome.storage.local.set()` を直接 `await` してから close する

---

## Shadow DOM の操作

### クエリ

```ts
await page.evaluate(() => {
  const host = document.querySelector('#extension-root')
  return host?.shadowRoot?.querySelector('[data-testid="btn"]')
    ?.getAttribute('aria-pressed')
})
```

### 信頼性の高いクリック（状態検証付きフォールバック）

ホストサイトの要素に遮蔽される場合、Playwright の `click()` が失敗する。「常に二重クリック」はトグル UI で元に戻るリスクがあるため、**verify-then-fallback** パターンで対処:

```ts
async function reliableClick(locator: Locator, verify: () => Promise<boolean>) {
  await locator.click({ force: true })
  if (await verify().catch(() => false)) return
  // JS フォールバック（isTrusted:false になる点に注意）
  await locator.evaluate(el => (el as HTMLElement).click())
}
```

- **`locator.evaluate()`** を使う理由: Shadow DOM 内の要素に `document.querySelector()` では到達できないが、locator 経由なら確実
- **isTrusted:false の制約**: JS の `el.click()` はブラウザのネイティブイベントではないため一部フレームワークに無視される。Playwright クリックを優先し JS はフォールバックとして使う

### ポーリングアサーション

Shadow DOM 内の状態変化を待つ:

```ts
await expect.poll(
  () => page.evaluate(() =>
    document.querySelector('#host')
      ?.shadowRoot?.querySelector('[data-testid="status"]')?.textContent
  ),
  { timeout: 15_000 }
).toBe('ready')
```

### よくある失敗

- **`locator.click()` がタイムアウト**: ホストサイトの要素が上に重なっている → `reliableClick` (verify-then-fallback) を使う
- **トグルが2回反転する**: 常に二重クリックしている → verify で状態確認し、成功していればフォールバックしない
- **`frameLocator()` が cross-origin iframe で動かない**: `page.evaluate()` で DOM を直接操作する

---

## iframe の取り扱い

### cross-origin iframe

```ts
const src = await page.evaluate(() => {
  const iframe = document.querySelector('iframe#target')
  try {
    return iframe?.contentDocument?.location?.href ?? null
  } catch {
    return iframe?.getAttribute('src') ?? null // cross-origin fallback
  }
})
```

### スロットリング回避

Chrome は `display: none` の iframe を強くスロットルする。画面外に配置して描画ツリーに残す:

```css
.offscreen-iframe {
  visibility: hidden;
  position: fixed;
  top: -200vh;
  width: 400px; /* 0 にするとスロットル対象 */
  pointer-events: none;
}
```

### Stale iframe

SPA 遷移後に前のページの iframe が DOM に残ることがある。`src` を現在ページの識別子と照合して検出する。
