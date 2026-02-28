# Chrome Extension E2E Playwright スキル作成のための調査レポート

> 調査対象: 77セッション中17件のE2E関連セッション、46+コミット、73MBの最大セッショントランスクリプト
> 調査日: 2026-02-28

---

## 1. プロジェクトの E2E 進化タイムライン

### Phase 1: 導入期 (2024-01)
- Playwright ボイラープレート導入、1テスト、ハードコード URL
- `waitForTimeout(2000)` による同期、コンセント処理なし
- **10ヶ月間の休止**

### Phase 2: 構築期 (2024-11 〜 2026-01)
- 1日で6コミットの試行錯誤（hover追加→複雑化→簡素化の振動）
- URL腐敗の初発見（ハードコードURLが壊れる）
- 動的URL探索の導入（`findLiveUrlWithChat`）
- 7+テストへ拡大

### Phase 3: 泥沼の安定化 (2026-02 初旬、5日間で8コミット)
- stale closure、CORS、`page.evaluate()` スコープ、MutationObserver CPU暴走、SPA stale iframe が一斉に顕在化
- **E2Eがプロダクションコードのバグ発見ツールに変化**
- 2回のrevert → アーキテクチャ分割（`chat/live/`, `chat/archive/`, `chat/runtime/`）
- CI追加 → 28分後にCI削除（YouTube実ページ依存の不安定さ）

### Phase 4: 秩序の構築 (2026-02 後半)
- `scenarios/` + `support/` + `config/` 3層アーキテクチャ
- POM (Page Object Model) 導入
- Worker-scoped fixtures でブラウザ起動21回→2回（8.7分→4.0分、-54%）
- `addInitScript` による `page.evaluate` ヘルパー統合

---

## 2. つまづきポイント完全リスト

### カテゴリA: Playwright × Chrome拡張 固有の罠

#### A1. MV3 Service Worker の遅延起動
- **問題**: SW はイベント駆動で lazy 起動。ページ遷移なしでは SW が起動しない
- **失敗した解決策**: `channel: 'chromium'` だけで解決を期待 → 7テスト失敗
- **成功した解決策**: warmup ページ（YouTube）に遷移して SW 起動をトリガー + 45秒ポーリング + `chrome://extensions` Shadow DOM フォールバック
- **セッション**: fffe286a, 複数回再発

#### A2. Extension ID の取得
- **問題**: SW が利用不能な場合、Extension ID を取得できない
- **解決策**: `chrome://extensions` の Shadow DOM を掘って ID を scrape するフォールバック
- **注意**: 公式パターン (`serviceWorker.url().split('/')[2]`) より堅牢だが脆い

#### A3. `page.evaluate()` のシリアライゼーション境界
- **問題**: evaluate コールバック内から Node.js スコープの変数を参照できない。TypeScript では検出不可能
- **影響**: `diagnostics.ts` が570行に膨張（`readIframeHref` 7コピー、`unavailableMarkers` 5コピー等）
- **失敗した対策**: 手動コピペ（保守不能）
- **成功した対策**: `context.addInitScript()` で `window.__ylcHelpers` として一括注入（-425行）
- **コミット**: 7dbc29b, f578531

#### A4. Chrome persistent context のフルスクリーンバグ
- **問題**: `launchPersistentContext` で、フルスクリーンに入ったページを `close()` すると、同一コンテキストの全ページでフルスクリーンが永久にブロックされる
- **失敗した解決策**: フルスクリーン退出後に close → 効果なし。`about:blank` 遷移後 close → 効果なし
- **成功した解決策**: 共有ページを **絶対にcloseしない**。テスト間で再利用
- **セッション**: e432c87b

#### A5. `headless: false` が必須
- **問題**: Chrome 拡張は headed モードでしか動作しない
- **CI対策**: `xvfb-run --auto-servernum` で仮想ディスプレイ → 結局CIから削除（外部依存の不安定さ）
- **コミット**: 3a36675 → 918a7f9

### カテゴリB: Zustand Persist × chrome.storage の罠

#### B1. 初回起動時にストアが storage に存在しない
- **問題**: Zustand persist は `set()` 呼び出し後にのみ storage へ書き込む。初回起動時、ストアキーは存在しない
- **影響**: read-modify-write パターンが失敗（読み取り結果が null）
- **解決策**: Zustand persist フォーマット (`{ state: {...}, version: 2 }`) で直接書き込み
- **セッション**: 851dd64a

#### B2. Popup ページの Zustand rehydration による storage 上書き
- **問題**: `chrome-extension://ID/popup.html` を開くと Zustand persist がデフォルト値で storage を上書き
- **影響**: テストで事前設定した storage 値が消失
- **解決策**: popup ページを開いた後は即座に `about:blank` に遷移。既存の popup ページを再利用
- **セッション**: 851dd64a, fffe286a（複数回再発）

#### B3. `window.close()` と async storage write のレース
- **問題**: `handleImport` が `setState()` 後に即 `window.close()`。persist の `chrome.storage.local.set()` は fire-and-forget なので書き込み前にポップアップが閉じる
- **解決策**: `chrome.storage.local.set()` を直接 `await` してから `window.close()`
- **セッション**: 84147d97

### カテゴリC: YouTube DOM の敵対的行動

#### C1. フルスクリーンで DOM が再構成される
- **問題**: `#chat-container` が `#secondary-inner` から `#panels-full-bleed-container` に移動
- **影響**: CSS 修正が間違った要素をターゲットに
- **発見方法**: Playwright 診断スペックで computed styles を計測
- **セッション**: d807d031

#### C2. iframe スロットリング
- **問題**: `display: none` を親コンテナに適用すると Chrome が iframe をスロットル
- **解決策**: `visibility: hidden` + `position: fixed` + `width: 400px` で描画ツリーに残す
- **コミット**: 7b89967

#### C3. SPA 遷移で stale iframe が残留
- **問題**: YouTube SPA 遷移後、古い動画の iframe が DOM に残り、モード誤判定の原因に
- **解決策**: iframe の video ID を現在の URL と照合。遷移ガードで同一 href の再アタッチをブロック
- **コミット**: 16c7b48, 54be946, 5c549be

#### C4. コンセントダイアログ
- **問題**: EU/ロケールによる GDPR コンセントバリア
- **解決策**: `acceptYouTubeConsentWithRetry` 統合ヘルパー（5箇所の重複を1箇所に）

#### C5. 広告の出現
- **問題**: スクリーンショットに広告が写る
- **解決策**: `waitForAdsToFinish()` — `ad-showing` CSS クラス検出 + Skip ボタンクリック + 60秒タイムアウト

#### C6. URL 腐敗
- **問題**: ハードコード YouTube URL が頻繁に無効化
- **進化**: ハードコード → 手動差し替え → 動的検索 → 3層フォールバック（キャッシュ → 環境変数 → YouTube検索）+ `test.skip()` による graceful degradation

### カテゴリD: Shadow DOM テスト困難

#### D1. Shadow DOM 内の要素クリック
- **問題**: YouTube のオーバーレイがクリックを遮る
- **解決策**: `reliableClick()` — Playwright `click({ force: true })` + JavaScript 直接 `click()` の二重実行

#### D2. Shadow DOM 内の iframe contentDocument アクセス
- **問題**: Shadow DOM コンテキストから cross-origin iframe の contentDocument にアクセス不可
- **解決策**: `page.evaluate()` で直接 DOM トラバーサル。`frameLocator()` は cross-origin iframe では使用不可

#### D3. ライブラリ CSS が Shadow DOM に到達しない
- **問題**: react-colorful が `document.head` に `<style>` を inject → Shadow DOM 内に到達しない
- **解決策**: CSS を手動抽出して WXT の `cssInjectionMode: 'ui'` で Shadow DOM に注入

### カテゴリE: テストアーキテクチャの罠

#### E1. POM バイパス
- **問題**: spec ファイルがローカルラッパー関数で POM をバイパス
- **影響**: メンテナンスコスト増大、パターン不統一
- **解決策**: ローカルラッパー削除、POM メソッド直接呼び出し

#### E2. skip / assert 境界の曖昧さ
- **問題**: `test.skip()` で行動結果をスキップ（テスト価値の無声劣化）
- **逆パターン**: `expect()` で環境依存の前提条件を assert（偽失敗）
- **ルール**: 環境は skip、振る舞いは assert

#### E3. ハードスリープの蔓延
- **問題**: `waitForTimeout(2000)` ～ `waitForTimeout(8000)` が散在
- **解決策**: `expect.poll()` やカスタムポーリング関数に置換
- **ルール化**: 「ランダム sleep での E2E 安定化は禁止」

#### E4. テストコードの大規模リファクタ失敗
- **問題**: diagnostic 統合の monolith 化 → 全テスト破壊
- **対応**: 即 revert → 段階的3層アーキテクチャ再構築
- **教訓**: テストコードにも段階的リファクタが必要

---

## 3. 成功パターン集

### P1. `addInitScript` + `window.__ylcHelpers`
共通 DOM ユーティリティをブラウザコンテキスト起動時に1回注入。全 `page.evaluate()` から参照可能。

### P2. Worker-scoped fixtures による高速化
- `sharedContext` / `sharedPage` を worker スコープで共有
- URL 探索用に別の `urlLookupContext` を分離（状態汚染防止）
- ブラウザ起動 21回→2回、実行時間 -54%

### P3. 非致命的前提条件メソッド
`ensureSwitchOff()` のように、前提条件セットアップは `.catch(() => {})` で非致命化。下流のアサーションが本来の検証を担当。

### P4. 診断キャプチャ (captureChatState)
失敗時に20+フィールドの状態 JSON を `testInfo.attach()` でアーティファクトに自動添付。

### P5. Deadline-based timeout budgeting
カスケードタイムアウト防止のため、残り時間を計算して各操作に予算を配分。

### P6. 3層 URL フォールバック
キャッシュ → 環境変数 → 動的 YouTube 検索 + `test.skip()` による graceful degradation。

### P7. 使い捨て診断スペック
問題調査用の一時的 E2E スペックを作成 → `page.evaluate()` で DOM メトリクス収集 → 修正確認 → 削除。

### P8. Zustand persist 直接書き込みパターン
`{ state: {...}, version: 2 }` フォーマットで `chrome.storage.local` に直接書き込み → `about:blank` 遷移で rehydration 回避。

---

## 4. プロジェクト固有のテスト基盤

### ファイル構造
```
e2e/
├── config/testTargets.ts       # URL設定 + 環境変数オーバーライド
├── fixtures.ts                 # Worker/Test スコープの Playwright fixtures
├── global-setup.ts             # ビルド出力確認
├── pages/
│   ├── YouTubeWatchPage.ts     # YouTube 動画ページ POM
│   └── ExtensionOverlay.ts     # 拡張 UI POM
├── scenarios/
│   ├── live/                   # 11 ライブテスト
│   ├── archive/                # 5 アーカイブテスト
│   └── popup/                  # 2 ポップアップテスト
├── screenshots/                # 3 スクリーンショットテスト
├── support/
│   ├── constants.ts            # タイムアウト定義
│   ├── diagnostics.ts          # 状態キャプチャ + デバッグ
│   ├── pageHelpers.ts          # addInitScript 注入ヘルパー
│   └── urls/archiveReplay.ts   # アーカイブURL選択
└── utils/                      # reliableClick, liveUrl, selectors 等
```

### テスト実行結果（最終）
- 17 passed, 3 skipped, 0 failed
- 実行時間: 約4分（workers=4）
- CI: ローカルのみ（YouTube外部依存のため CI から削除済み）

---

## 5. スキル作成への示唆

このレポートから、Chrome Extension E2E スキルに含めるべき知識領域:

1. **拡張ロード**: `launchPersistentContext` + `--load-extension` + `headless: false`
2. **MV3 SW 起動待機**: warmup ページ + ポーリング + chrome://extensions フォールバック
3. **page.evaluate() スコープ**: シリアライゼーション境界の理解 + `addInitScript` パターン
4. **chrome.storage テストアクセス**: SW 経由 or popup ページ経由 + Zustand persist フォーマット
5. **Shadow DOM クリック**: `reliableClick` 二重実行パターン
6. **iframe 操作**: cross-origin 制約、スロットリング回避、stale iframe 防止
7. **外部サービス URL 管理**: 3層フォールバック + `test.skip()` degradation
8. **診断キャプチャ**: 失敗時の自動状態スナップショット
9. **Fixture 設計**: Worker-scoped 共有 + フルスクリーンバグ回避
10. **skip vs assert 境界**: 環境前提条件と行動アサーションの明確な分離
