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

### Storage accessor のランタイムフォールバック

`createStorageAccessor` は Worker → e2e.html bridge のランタイムフォールバック。一度 Worker が失敗したら以降は Page パスを使い続ける。`public/e2e.html`（React/Zustand なし）は WXT が `.output/chrome-mv3/e2e.html` に自動コピーし、`global-setup.ts` で存在を検証している。

### Consent handler / data-ylc-* テストアンカー

SKILL.md の Guardrails #6, #8 を参照。`registerConsentHandler()` は `sharedPage`/`liveUrl`/`archiveReplayUrl` の各 fixture で登録済み。Cookie 事前注入（`acceptYouTubeConsent()`）と併用。

---

## URL 管理

### 3 層フォールバック

1. **環境変数** (`YLC_LIVE_URL` 等) — CI やローカルでの上書き用
2. **ハードコード** (`e2e/config/testTargets.ts`) — 安定した動画 URL
3. **動的探索** (`findLiveUrlWithChat`) — live URL のみ。ワーカー間キャッシュ → 環境変数 → 検索

### ワーカー間 URL 共有

`findLiveUrlWithChat` は `$TMPDIR/ylc-e2e-live-url.txt` を介して発見済み URL をワーカー間で共有する。`global-setup.ts` が各テストランの開始時にキャッシュファイルを削除し、最初に URL を発見したワーカーが書き込む。後続ワーカーはキャッシュを読み取り、`isPlayableLiveCandidate` で検証後に即利用する。

探索順: キャッシュ読み取り → preferred URL → 検索ループ。各段階で URL 発見時にキャッシュ書き込み。

### 候補検査の効率化

`isPlayableLiveCandidate` は以下の順で早期脱出する:
1. `#movie_player` 待機（max 8s）
2. `ytd-live-chat-frame` コンテナ待機（max 5s）— 不在なら即脱出
3. `checkLiveChatStatus` ポーリング（残り時間）

全ステップに `deadline` を適用し、時間超過時の無駄な待機を防ぐ。

### 診断ログ

`[liveUrl]` プレフィックスで探索過程を stdout に出力する。cache hit/miss、検索ページの候補数、各候補の結果（status + 所要時間）、最終結果が記録される。

### URL ドリフト対応

動画削除・非公開化でテストが skip になったら `e2e/config/testTargets.ts` を更新する。各モードの URL 要件は `mode-contracts.md` の 4 モード概要を参照。
