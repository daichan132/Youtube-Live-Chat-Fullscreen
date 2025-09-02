# Repository Guidelines

## プロジェクト構成とモジュール
- entrypoints/: 拡張機能のエントリ
  - content/: コンテンツスクリプト UI（React）とフック
  - popup/: ポップアップ（React + UnoCSS）
- shared/: 共有コンポーネント・hooks・stores（Zustand）・i18n・utils
- e2e/: Playwright の仕様・フィクスチャ
- public/: 静的アセットと Chrome/Firefox 用 locales
- .output/: ビルド成果物（例: `.output/chrome-mv3`）

## ビルド・テスト・開発コマンド
- `yarn dev`: WXT 開発サーバ（Chrome）。Firefox は `yarn dev:firefox`
- `yarn build`: 本番ビルド。Firefox は `yarn build:firefox`
- `yarn zip`: Zip 化。Firefox は `yarn zip:firefox`
- `yarn lint`: Biome チェック + TypeScript 型検査
- `yarn format`: Biome で整形（`entrypoints/**` と `shared/**`）
- `yarn e2e`: Playwright E2E（事前に `yarn build` 必須）

## コーディングスタイルと命名
- 言語: TypeScript + React 19。CSS は UnoCSS ユーティリティ
- 整形/静的解析: Biome（`biome.json`）。2 スペース、シングルクォート、必要時のみセミコロン
- ファイル: コンポーネントは PascalCase（例: `Popup.tsx`）
- フック: `useXxx` の camelCase。テスト: `*.spec.ts`
- 状態管理: `shared/stores` の Zustand を優先。`any` は避け、Biome の警告に従う

## テスト指針
- フレームワーク: Playwright（`@playwright/test`）。`e2e/` 配下
- 実行: `yarn build` → `yarn e2e`。`fixtures.ts` の拡張 `test` と `expect` を使用
- 命名: `xxx.spec.ts`。非決定的挙動やネットワーク依存は最小化

## コミットとプルリクエスト
- コミット: 簡潔に範囲を明確化。`feat:`, `fix:`, `docs:`, `chore:`, `refactor:` を推奨
- PR: 目的/変更点、関連 Issue、UI 変更はスクリーンショットを添付
- チェック: ローカルで `yarn lint` と `yarn build` が通ること。CI が build/lint を実行
- フック: Lefthook により commit/push 時に Biome が走ります

## セキュリティと設定 Tips
- 秘密情報やトークンをハードコードしない
- 拡張は Web ページ上で動作するため XSS に注意。`dangerouslySetInnerHTML` は避ける
- i18n: `shared/i18n/assets` と `public/_locales` に翻訳を追加。キーは安定させる

## アーキテクチャ概要
- WXT ベース。YouTube 上の Shadow DOM 内に Content UI を描画
- Popup で設定を操作。共有ロジックは `shared/`、状態は Zustand、翻訳は i18next
