# AGENTS.md (Codex用・簡易版)

## 0. 目的
- このリポジトリで安全かつ再現性高く作業するための最小ルール。
- 迷ったら「小さく直す」「根拠を取る」「検証する」を優先。

## 1. 最初にやること
- 推測で触らず、まず `rg` で対象箇所を特定する。
- 生成物は編集しない。
  - 例: `.output/**`
- 変更は最小・局所。既存の hooks/store/utils パターンを優先する。

## 2. プロジェクト構造（content 詳細）
- `entrypoints/content/index.tsx`: content script のエントリポイント。
- `entrypoints/content/Content.tsx`: fullscreen 時の portal 生成と switch 配置の起点。
- `entrypoints/content/YTDLiveChat.tsx`: overlay 表示判定、native 連携、iframe 表示の中核。

- `entrypoints/content/chat/live`: live 用 source 解決（公開 `live_chat` 直結）。
- `entrypoints/content/chat/archive`: archive 用 source 解決（native `live_chat_replay` borrow）と native open 補助。
- `entrypoints/content/chat/runtime`: mode 判定、overlay 可視判定、iframe ローダー、fullscreen source/toggle 判定。
- `entrypoints/content/chat/shared`: iframe href/video-id 判定など mode 共通ユーティリティ。

- `entrypoints/content/features/YTDLiveChatSwitch`: fullscreen 右下スイッチ UI。
- `entrypoints/content/features/YTDLiveChatIframe`: chat iframe の attach/detach と初期化。
- `entrypoints/content/features/YTDLiveChatSetting`: 設定モーダルとプリセット編集 UI。
- `entrypoints/content/features/Draggable`: overlay のドラッグ/リサイズ/表示制御。

- `entrypoints/content/hooks/globalState`: popup/ストレージ連動（言語・ON/OFF）。
- `entrypoints/content/hooks/watchYouTubeUI`: fullscreen、native chat 状態、YouTube DOM 監視。
- `entrypoints/content/hooks/ylcStyleChange`: 色/フォント/余白などの表示スタイル反映。
- `entrypoints/content/hooks/dom`: DOM observer 系の共通フック。

- `entrypoints/content/utils`: YouTube 状態判定（videoId/live/no-chat/native chat など）と DOM 補助。
- `entrypoints/content/constants`: DOM id など content 内定数。

- `entrypoints/popup`: 拡張 popup UI。
- `shared`: 共通 hooks / stores / i18n / utils。
- `e2e`: Playwright テスト。
- `public/_locales`: 拡張ストア表示文言。

## 3. fullscreen chat の重要契約（最優先）
1. live
- 公開 iframe `live_chat?v=<videoId>` を使う。
- native iframe を borrow しない。

2. archive
- native `live_chat_replay` iframe のみ borrow する。
- 動画遷移後に stale iframe を再利用しない。

3. no-chat / replay-unavailable
- switch は表示しない。
- overlay / extension iframe は出さない。

4. 判定責務
- `canToggle`（スイッチ有効化）と `sourceReady`（attach可否）を分離する。
- archive で `sourceReady` だけを switch 有効条件にしない（deadlock回避）。

## 4. 実装ルール
- `any` は避ける。
- ユーザー向け文言は原則 i18n 化する。
- i18n 更新時は必ず両方を更新する。
  - `shared/i18n/assets`
  - `public/_locales`
- 依存追加は事前に「目的」と「代替案」を短く示す。

## 5. テスト/検証ルール
- 基本:
  - `yarn lint`
  - `yarn test:unit`
  - `yarn build`
- Firefox互換が関係する場合:
  - `yarn build:firefox`
- UI/挙動/E2Eに影響する場合:
  - 対象 spec を先に実行（`yarn playwright test ... --workers=1`）
  - 最後に `yarn e2e`
- E2E方針:
  - 固定URL設定は `e2e/config/testTargets.ts` を正とする（`YLC_*` は上書き用途）。
  - `yarn e2e`: 開発向け。外部前提不足の `skip` は許容。
  - `yarn e2e:ci`: 必須specが `skip` の場合は失敗。
  - `skip`: 外部前提不足（URL drift 等）
  - `fail`: 前提成立後の拡張不具合
  - ランダム sleep での安定化は禁止

## 6. セキュリティ/安全運用
- 秘密情報・トークンをハードコードしない。
- `dangerouslySetInnerHTML` は原則禁止。
- permissions / host_permissions の追加は勝手に行わない。
- 破壊的操作を勝手に実行しない。
  - `git reset --hard`
  - `git checkout --`
  - `rm -rf`
- 履歴改変（rebase/force push/amend）は明示依頼がある場合のみ。

## 7. Skills 運用
- 1 skill = 1責務で保つ。
- 使いにくい skill はその場で最小修正する。
- 詳細ルールは各 skill の `SKILL.md` を参照:
  - `.codex/skills/*/SKILL.md`
