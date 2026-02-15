# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Live Chat Fullscreen — YouTube のライブチャットをフルスクリーン上にオーバーレイ表示するブラウザ拡張。ドラッグ・リサイズ・スタイルカスタマイズ対応。Chrome / Firefox 両対応。

## Tech Stack

- **Framework**: WXT (cross-browser extension framework) + React 19 + TypeScript
- **State**: Zustand (persisted via `redux-persist-webextension-storage`)
- **Styling**: UnoCSS (atomic) + CSS variables (`shared/styles/theme.css`)
- **Linter/Formatter**: Biome (single quote, no semicolons, 140 line width)
- **Unit Test**: Vitest + Testing Library (jsdom)
- **E2E**: Playwright (Chromium)
- **Package Manager**: Yarn 4 (Corepack)

## Commands

```bash
# Development
yarn dev                  # Chrome dev server
yarn dev:firefox          # Firefox dev server

# Quality checks (基本3点セット — PR前に必ず実行)
yarn lint                 # Biome check --write + tsc --noEmit
yarn test:unit            # Vitest run
yarn build                # Chrome production build

# Additional checks
yarn build:firefox        # Firefox互換が関係する場合
yarn compile              # TypeScript型チェックのみ
yarn format               # Biome format --write のみ

# E2E
yarn e2e                  # Playwright全テスト (workers=1)
yarn playwright test e2e/popup.spec.ts --workers=1  # 単一specファイル

# Single unit test
yarn vitest run shared/i18n/assets.spec.ts  # 単一ファイル
yarn vitest run --testNamePattern "pattern"  # パターン指定

# Other
yarn storybook            # Storybook dev (port 6006)
yarn zip                  # Chrome用zipパッケージ
yarn zip:firefox          # Firefox用zipパッケージ
```

## Architecture

### Entry Points (`entrypoints/`)

**Content Script** (`entrypoints/content/`) — YouTube ページに inject。Shadow DOM 内に React ルートを生成。
- `index.tsx` → `Content.tsx` → `YTDLiveChat.tsx` の階層
- `chat/` — チャットソース解決。**live** と **archive** で戦略が異なる（後述の契約を参照）
  - `live/` — 公開 `live_chat?v=<videoId>` iframe
  - `archive/` — native `live_chat_replay` iframe の borrow
  - `runtime/` — mode 判定 (live/archive/none)、iframe ローダー
- `features/` — UI 機能群（Switch, Iframe, Setting, Draggable）
- `hooks/` — globalState 同期、YouTube UI 監視、スタイル反映
- `utils/` — YouTube 状態判定（videoId, live判定, chat有無）

**Popup** (`entrypoints/popup/`) — ツールバーポップアップ UI

### Shared (`shared/`)

- `stores/` — Zustand ストア（globalSettingStore, ytdLiveChatStore, ytdLiveChatNoLsStore）
- `i18n/` — i18next 設定 + 50 言語以上の翻訳 JSON
- `styles/theme.css` — Light/Dark テーマの CSS variables + 全コンポーネントスタイル
- `components/`, `hooks/`, `types/`, `utils/`

### State Management

3 つの Zustand ストアで管理:
- `globalSettingStore` — テーマ、言語、ON/OFF
- `ytdLiveChatStore` — チャットスタイル（色、フォント、サイズ等）。`chrome.storage` で永続化
- `ytdLiveChatNoLsStore` — 非永続状態

## Fullscreen Chat の重要契約

変更時に最も注意が必要なルール:

1. **live**: 公開 iframe `live_chat?v=<videoId>` を使う。native iframe を borrow しない
2. **archive**: native `live_chat_replay` iframe のみ borrow する。動画遷移後に stale iframe を再利用しない
3. **no-chat / replay-unavailable**: switch を表示しない。overlay / extension iframe を出さない
4. **判定責務**: `canToggle`（スイッチ有効化）と `sourceReady`（attach 可否）は分離する。archive で `sourceReady` だけを switch 有効条件にしない（deadlock 回避）

## Implementation Rules

- `any` は避ける
- ユーザー向け文言は i18n 化する
- **i18n 更新時は2箇所を同時に更新する**:
  - `shared/i18n/assets/*.json` — ランタイム翻訳
  - `public/_locales/*/messages.json` — ストア表示文言
- 依存追加は事前に「目的」と「代替案」を示す
- 生成物（`.output/**`）は編集しない
- 既存の hooks/store/utils パターンを優先する
- permissions / host_permissions の追加は確認なしに行わない

## Testing Rules

- **基本3点**: `yarn lint` → `yarn test:unit` → `yarn build`
- Firefox 互換が関係する場合: `yarn build:firefox` も実行
- E2E: 対象 spec を先に単体実行 → 最後に `yarn e2e`
- E2E の固定 URL 設定は `e2e/config/testTargets.ts` が正
- ランダム sleep での E2E 安定化は禁止

## Git Hooks (Lefthook)

- **pre-commit**: `biome check --apply` (staged files)
- **pre-push**: `biome check` (pushed files)
