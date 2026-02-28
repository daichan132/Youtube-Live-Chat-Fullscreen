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

### about:blank rehydration 回避

Zustand persist ストアへの direct write 後、popup ページ等を about:blank に遷移させる。これをしないと拡張の rehydration が write した値を上書きする。

---

## URL 管理

### 3 層フォールバック

1. **環境変数** (`YLC_LIVE_URL` 等) — CI やローカルでの上書き用
2. **ハードコード** (`e2e/config/testTargets.ts`) — 安定した動画 URL
3. **動的探索** (`findLiveUrlWithChat`) — live URL のみ。前回キャッシュ → 環境変数 → 検索

### URL ドリフト対応

動画削除・非公開化でテストが skip になったら `e2e/config/testTargets.ts` を更新する。各モードの URL 要件は `mode-contracts.md` の 4 モード概要を参照。
