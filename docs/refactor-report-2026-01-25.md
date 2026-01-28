# リファクタリング調査レポート（2026-01-25）

## 1. 調査範囲
- TypeScript/React: `entrypoints/**`, `shared/**`, `e2e/**`
- Python scripts: `i18n_scripts/src/**`
- 設定: `wxt.config.ts`, `web-ext.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `uno.config.ts`, `package.json`, `tsconfig.json`
- CSS/HTML/i18n: `entrypoints/popup/**`, `entrypoints/content/features/YTDLiveChatIframe/styles/iframe.css`, `shared/i18n/assets/*`, `public/_locales/*`, `shared/i18n/language_codes.json`

---

## 2. 優先度: 高（バグ/安定性/保守性に直結）

### 2.1 重要な DOM ID/Selector を共通化
**対象**:  
`entrypoints/content/Content.tsx`, `entrypoints/content/YTDLiveChat.tsx`,  
`entrypoints/content/features/YTDLiveChatSetting/utils/getModalParentElement.ts`,  
`e2e/*`（複数）

**理由**:  
同じ ID が複数ファイルに直書きされており、変更が必要になった時に漏れやすい。

**効果**:  
変更点の一元化・E2E の保守性向上。

---

### 2.2 `useIsShow` の責務が重すぎる
**対象**: `entrypoints/content/hooks/watchYouTubeUI/useIsShow.ts`

**理由**:  
「fullscreen 判定」「masthead の監視」「native chat の状態判定」「画面外補正」が 1 ファイルに混在。

**効果**:  
分割することでテストが容易になり、修正時の副作用を減らせる。

---

### 2.3 フルスクリーン系の CSS 注入ロジックを整理
**対象**:  
`useFullscreenChatLayoutFix.ts`, `useYTPopupCss.ts`, `styleTag.ts`

**理由**:  
用途が近いスタイル注入が複数あり、未使用の可能性もある。

**効果**:  
不要コード削減、スタイル衝突の予防、修正点の明確化。

---

## 3. 優先度: 中（重複の削減・読みやすさ）

### 3.1 設定 UI の重複を共通化
**対象**:  
`SettingContent.tsx`, `PresetSettingContent.tsx`

**理由**:  
ほぼ同じ項目定義が 2 箇所にあり、改修時にズレる。

**改善案**:  
「Setting 項目定義」を共通のデータ配列にして再利用。

---

### 3.2 Switch UI 群の共通化
**対象**:  
`entrypoints/content/features/YTDLiveChatSetting/components/YLCChangeItems/*`

**理由**:  
ほぼ同じ実装が多数あり、差分が増えやすい。

**改善案**:  
共通コンポーネント（ラベル・状態・変更処理を渡すだけ）にまとめる。

---

### 3.3 Color Picker の重複
**対象**:  
`BgColorPicker.tsx`, `FontColorPicker.tsx`

**理由**:  
ロジックと UI がほぼ同じ。

**改善案**:  
共通 UI + カラーロジックの注入に整理。

---

### 3.4 Style Change Hook の統合
**対象**:  
`entrypoints/content/hooks/ylcStyleChange/*`

**理由**:  
同じ構造（setProperty → changeX）が多数。

**改善案**:  
`property → handler` のマップ化で同種コードを削減。

---

## 4. 優先度: 中（E2E/テスト保守性）

### 4.1 E2E の helper 重複
**対象**:  
`e2e/nativeChatClosedExtensionLoads.spec.ts`, `e2e/fullscreenChatOffset.spec.ts`,  
`e2e/noChatVideo.spec.ts` ほか

**理由**:  
`isNativeChatUsable` / `hasPlayableChat` / `isExtensionChatLoaded` が各 spec に散在。

**改善案**:  
`e2e/utils/` へ共通化して読みやすくする。

---

### 4.2 Fullscreen の操作手順が重複
**対象**:  
`e2e/fullscreenChatToggle.spec.ts`, `e2e/fullscreenChatDoesNotBlockClicks.spec.ts` ほか

**改善案**:  
「Fullscreen に入る」「ボタン待機」「切り替え」を helper にまとめる。

---

### 4.3 再生可否判定ロジックのズレ防止
**対象**:  
`e2e/utils/liveUrl.ts` と `entrypoints/content/utils/hasPlayableLiveChat.ts`

**理由**:  
同じ概念の判定が別実装でずれると、E2E と本番挙動が乖離する。

**改善案**:  
判定ロジックの共通化 or 片方に寄せる。

---

## 5. 優先度: 低（改善すると良い小さな点）

### 5.1 className のテンプレート文字列誤り
**対象**:  
`entrypoints/content/features/YTDLiveChatIframe/components/YTDLiveChatIframe.tsx`

**内容**:  
`className` 内に `${...}` が文字列として残っている（意図したスタイルが効かない可能性）。

---

### 5.2 iframe 内 style 挿入の document 不一致
**対象**:  
`entrypoints/content/hooks/ylcStyleChange/useYLCFontFamilyChange.ts`

**内容**:  
iframe の `contentWindow.document` に style を追加する箇所で、`document.createElement` が親 document を参照している。

---

### 5.3 side-effect import の必要性確認
**対象**:  
`entrypoints/content/features/YTDLiveChatIframe/hooks/useIframeLoader.ts`

**内容**:  
`import '@/entrypoints/content'` が必要か不明。不要なら削除可能。

---

## 6. 改修の進め方（おすすめ順）
1. **DOM ID/Selector の共通化**（影響大、効果大）  
2. **useIsShow の分割**（理解しやすくする）  
3. **Setting UI 定義の共通化**（重複削減）  
4. **E2E helper の共通化**（保守性向上）  
5. **小さな不具合修正**（className 等）

---

## 7. 追加メモ
- 初期プリセット名は `i18n.t` を初期化時に固定化しているため、言語切り替え後は更新されない。  
  → 「キー保存」方式にすると言語切替に追従できる。
- `useHasPlayableLiveChat` は 1秒ポーリングで最大 100回。  
  → `MutationObserver` 併用なら負荷と遅延を減らせる。
