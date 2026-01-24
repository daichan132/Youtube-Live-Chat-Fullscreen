# テスト計画（不足領域の補完）

## 目的
- 既存E2Eの補完とユニット/結合の穴埋めで、主要なユーザー価値（フルスクリーン表示/操作/設定/復元）を網羅する。

---

## 優先度 High

### 1) コンテンツ注入・ライフサイクル
- 対象: `entrypoints/content/Content.tsx` `entrypoints/content/index.tsx`
- 目的: shadow root/スイッチ挿入・削除・ポータル生成の正当性
- 種別: E2E（実ブラウザのDOM連携が必要）
- 想定テスト:
  - フルスクリーン入退出で shadow host・switch が生成/削除される
  - `hasPlayableChat` 偽のとき UI が出ない

### 2) 表示判定とネイティブチャット連動
- 対象: `entrypoints/content/hooks/watchYouTubeUI/useIsShow.ts` `entrypoints/content/YTDLiveChat.tsx`
- 目的: ネイティブチャットの開閉・拡張時にYLCが自動で無効化される
- 種別: E2E + ユニット（ロジック分離可能なら）
- 想定テスト:
  - ネイティブチャットを開くとYLCがOFFになる
  - `masthead-hidden`/fullscreen 変化で表示フラグが正しく更新される

### 3) iframe 移動・スタイル注入・復帰
- 対象: `entrypoints/content/features/YTDLiveChatIframe/hooks/useIframeLoader.ts`
- 目的: iframe 移動/復元・load時のスタイル適用
- 種別: E2E（iframe DOM操作）
- 想定テスト:
  - 既存 `ytd-live-chat` iframe が拡張DOMへ移動される
  - unmount時に元の場所へ戻る
  - load時に style が注入される

### 4) ドラッグ/リサイズ/クリック遮断
- 対象:
  - `entrypoints/content/features/Draggable/components/Draggable.tsx`
  - `entrypoints/content/features/Draggable/components/DraggableItem.tsx`
  - `entrypoints/content/features/Draggable/hooks/useResizableHandlers.ts`
  - `entrypoints/content/features/Draggable/hooks/useYouTubePointerEvents.ts`
- 目的: 位置/サイズ更新の正当性とクリック遮断回避
- 種別: E2E + ユニット
- 想定テスト:
  - 画面端でリサイズしても座標が負にならない
  - `pointer-events` が `auto` に復帰する

---

## 優先度 Medium

### 5) 設定モーダル・プリセット
- 対象: `entrypoints/content/features/YTDLiveChatSetting/components/*`  
  `entrypoints/content/features/YTDLiveChatSetting/utils/getModalParentElement.ts`
- 目的: モーダル表示、タブ切替、D&D並び替え
- 種別: E2E + ユニット（D&DはE2E寄り）
- 想定テスト:
  - 設定モーダルの開閉
  - プリセット並び替えで順序が保存される

### 6) スタイル変更フック群
- 対象:
  - `entrypoints/content/hooks/ylcStyleChange/useYLCFontFamilyChange.ts`
  - `entrypoints/content/hooks/ylcStyleChange/useYLCFontColorChange.ts`
  - `entrypoints/content/hooks/ylcStyleChange/useYLCFontSizeChange.ts`
  - `entrypoints/content/hooks/ylcStyleChange/useYLCSpaceChange.ts`
  - `entrypoints/content/hooks/ylcStyleChange/useYLCUserNameDisplayChange.ts`
  - `entrypoints/content/hooks/ylcStyleChange/useYLCUserIconDisplayChange.ts`
  - `entrypoints/content/hooks/ylcStyleChange/useYLCReactionButtonDisplayChange.ts`
  - `entrypoints/content/hooks/ylcStyleChange/useYLCSuperChatBarDisplayChange.ts`
- 目的: CSS変数/スタイルが正しく反映される
- 種別: ユニット（JSDOM）
- 想定テスト:
  - `setProperty` が期待値で呼ばれる
  - フォントの `@import` 更新が上書きされる

### 7) Popup → Content メッセージ連携
- 対象:
  - `entrypoints/popup/components/LanguageSelector.tsx`
  - `entrypoints/popup/components/YTDLiveChatSwitch.tsx`
  - `entrypoints/content/hooks/globalState/useI18n.ts`
  - `entrypoints/content/hooks/globalState/useYtdLiveChat.ts`
- 目的: 言語/表示設定が content に反映される
- 種別: E2E または統合テスト
- 想定テスト:
  - Popupで言語変更 → Contentの i18n が更新
  - PopupでON/OFF → Content側のstoreが同期

---

## 実装順（推奨）
1. High の E2E から追加（実ブラウザ依存が高い領域）
2. 次にスタイル変更系のユニット
3. 仕上げに設定UI・Popup連携

---

## テスト実行（DoD）
- `yarn lint`
- `yarn build`
- `yarn e2e`（UI/挙動に影響がある場合）

---

## ユースケースベースの把握（操作順と利用機能）

### 基本利用（ライブ/リプレイ → フルスクリーン → チャット表示）
- フルスクリーン化 → 右下コントロールにスイッチ挿入 → スイッチONでチャットiframeを移動＆表示
- 対象: `entrypoints/content/Content.tsx` `entrypoints/content/features/YTDLiveChatSwitch/components/YTDLiveChatSwitch.tsx` `entrypoints/content/features/YTDLiveChatIframe/hooks/useIframeLoader.ts`

### チャット不可時の非表示
- 再生不可/リプレイ不可ならスイッチ自体を出さない
- 対象: `entrypoints/content/hooks/watchYouTubeUI/useHasPlayableLiveChat.ts` `entrypoints/content/Content.tsx`

### ネイティブチャットとの排他
- ネイティブチャットを開く/トグルすると拡張チャットをOFF
- 対象: `entrypoints/content/YTDLiveChat.tsx` `entrypoints/content/hooks/watchYouTubeUI/useIsShow.ts`

### 位置/サイズ調整（ドラッグ＆リサイズ）
- ドラッグ中はYouTube側のpointer-eventsを無効化し、終了で復帰
- ウィンドウサイズ変更で画面外にはみ出ない補正
- 対象: `entrypoints/content/features/Draggable/components/Draggable.tsx` `entrypoints/content/features/Draggable/components/DraggableItem.tsx` `entrypoints/content/features/Draggable/hooks/useResizableHandlers.ts` `entrypoints/content/features/Draggable/components/EffectComponent/*`

### 見た目変更（設定モーダル）
- 設定アイコン → モーダル開く → 色/フォント/サイズ/ぼかし/余白/表示トグルを変更
- 対象: `entrypoints/content/features/Draggable/components/ControlIcons.tsx` `entrypoints/content/features/YTDLiveChatSetting/components/*` `entrypoints/content/hooks/ylcStyleChange/*`

### Chat-only（ヘッダ/入力のクリップ）
- `alwaysOnDisplay` かつ `chatOnlyDisplay` 時にクリップパスを有効化して表示領域を調整
- 対象: `entrypoints/content/features/Draggable/components/EffectComponent/ClipPathEffect.tsx` `entrypoints/content/features/Draggable/hooks/useClipPathManagement.ts`

### プリセット管理
- プリセット追加/適用/並び替え/削除/タイトル変更
- 対象: `entrypoints/content/features/YTDLiveChatSetting/components/PresetContent/*` `shared/stores/ytdLiveChatStore.ts`

### Popup連携（言語/ON-OFF）
- Popupで切替 → contentへメッセージ送信 → store/i18n反映
- 対象: `entrypoints/popup/components/LanguageSelector.tsx` `entrypoints/popup/components/YTDLiveChatSwitch.tsx` `entrypoints/content/hooks/globalState/useI18n.ts` `entrypoints/content/hooks/globalState/useYtdLiveChat.ts`

---

## ユースケース基準のテスト抜け（優先候補）

### Popup → Content 連携
- 言語切替が content 側に反映される/表示文言が変わる
- ON/OFF が `useGlobalSettingStore` に反映される
- 対象: `entrypoints/popup/components/LanguageSelector.tsx` `entrypoints/popup/components/YTDLiveChatSwitch.tsx` `entrypoints/content/hooks/globalState/useI18n.ts` `entrypoints/content/hooks/globalState/useYtdLiveChat.ts`

### クリップパス（Chat-only）挙動
- `alwaysOnDisplay` + `chatOnlyDisplay` で clip-path 有効化
- サイズ/座標補正、hover/setting中の切替、unmount cleanup
- 対象: `entrypoints/content/features/Draggable/components/EffectComponent/ClipPathEffect.tsx` `entrypoints/content/features/Draggable/hooks/useClipPathManagement.ts`

### 設定モーダルの主要項目
- 色/サイズ/ぼかし/余白/表示トグルの変更と反映
- 対象: `entrypoints/content/features/YTDLiveChatSetting/components/YLCChangeItems/*`

### プリセット操作
- 追加/適用/削除/並び替え/タイトル編集、`addPresetEnabled` の制御
- 対象: `entrypoints/content/features/YTDLiveChatSetting/components/PresetContent/*` `shared/stores/ytdLiveChatStore.ts`

### ドラッグ/リサイズの境界条件
- 最小サイズ/負座標防止/ウィンドウリサイズ補正
- 対象: `entrypoints/content/features/Draggable/hooks/useResizableHandlers.ts` `entrypoints/content/features/Draggable/components/EffectComponent/WindowResizeEffect.tsx`

### 表示/非表示の自動制御
- idle/hover/focus による `isDisplay` 切替、フォーカス外でも表示保持
- 対象: `entrypoints/content/features/Draggable/components/EffectComponent/DisplayEffect.tsx`

### ネイティブチャットのトグルクリック時の排他
- クリック判定と `setYTDLiveChat(false)` が確実に発火するか
- 対象: `entrypoints/content/YTDLiveChat.tsx`
