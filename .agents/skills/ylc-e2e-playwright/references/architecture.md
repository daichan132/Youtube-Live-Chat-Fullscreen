# E2E Architecture — 非自明なパターン

コードから読み取れる API 仕様（POM メソッド、ヘルパー関数、セレクタ定数等）は `e2e/` ディレクトリのソースを参照。ここではコードからは読み取りにくい設計意図と落とし穴を記録する。

---

## Fixture 設計の意図

### なぜ Worker-scoped で共有するか

`launchPersistentContext` は起動コストが高い（拡張ビルドのロード + SW 起動待ち）。Worker-scoped で 1 回だけ起動し、全テストで共有する。

### Chromium フルスクリーンバグ

`launchPersistentContext` で起動したブラウザでは、フルスクリーンに入ったページを `close()` すると、以降の全ページでフルスクリーンが永久にブロックされる。このため共有ページは close しない。テスト間のクリーンアップは storage.clear → exitFullscreen → about:blank 遷移で行う。

### URL 探索の分離

Live URL 探索（VTuber 検索 → 最大 18 候補巡回）はテスト本体とは別の `urlLookupContext` で行う。テストコンテキストの cookie / storage を汚さないため。

### Storage accessor の boot-time bifurcation

`e2e/fixtures.ts` の `createStorageAccessor` は、fixture 起動時の Worker 有無で2パスに分岐する。Worker パス（CDP keep-alive で参照が有効）と Page パス（毎回 `e2e.html` を開く）の2つで、実行時のフォールバックチェーンは持たない。詳細は **chrome-extension-e2e-playwright** スキルの Section 4 を参照。

**e2e.html bridge**: Page パスは `popup.html` ではなく `public/e2e.html`（React/Zustand なしの最小ページ）を使用。rehydration リスクがなく `about:blank` 遷移も不要。WXT が `.output/chrome-mv3/e2e.html` に自動コピーする。`global-setup.ts` でビルド出力に `e2e.html` が含まれることを検証している。

### Consent handler

`registerConsentHandler()` が `sharedPage`、`liveUrl`、`archiveReplayUrl` の各 fixture で登録済み。`page.addLocatorHandler()` で YouTube の同意ダイアログ（"Accept all"、"I agree"、"同意する"）を自動クリックする。Cookie 事前注入（`acceptYouTubeConsent()`）と補完関係で併用。

### data-ylc-* テストアンカー

E2E セレクタは Tailwind のクラス名に依存せず `data-ylc-*` カスタム属性を使う。プロダクトコード側で `data-ylc-overlay-container`, `data-ylc-resizable`, `data-ylc-chat-inner`, `data-ylc-settings-btn` 等を付与し、E2E 側で `[data-ylc-*]` セレクタで参照する。スタイル変更時のセレクタ破壊を防ぐ。

---

## URL 管理

### 3 層フォールバック

1. **環境変数** (`YLC_LIVE_URL` 等) — CI やローカルでの上書き用
2. **ハードコード** (`e2e/config/testTargets.ts`) — 安定した動画 URL
3. **動的探索** (`findLiveUrlWithChat`) — live URL のみ。前回キャッシュ → 環境変数 → 検索

### URL ドリフト対応

動画削除・非公開化でテストが skip になったら `e2e/config/testTargets.ts` を更新する。各モードの URL 要件は `mode-contracts.md` の 4 モード概要を参照。
