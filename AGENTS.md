# AGENTS.md (Codex 用)

## TL;DR（最短ルート）
- まず `rg` で該当箇所を特定してから編集する（推測で作らない）
- 変更は最小・局所。共有化するなら `shared/` に寄せる
- 変更後は基本 `yarn lint` → `yarn build`（必要なら `yarn build:firefox`）→ UI/挙動に影響があるなら `yarn e2e`
- Skills に違和感があれば **即時に最小修正**（次回も迷わないように）

---

## Project map（最短ナビ）
- `entrypoints/`: 拡張のエントリ
  - `content/`: コンテンツスクリプト UI（React）とフック
  - `popup/`: ポップアップ（React + UnoCSS）
- `shared/`: 共有コンポーネント / hooks / Zustand stores / i18n / utils
- `e2e/`: Playwright 仕様・フィクスチャ
- `public/`: 静的アセットと Chrome/Firefox 用 locales
- `.output/`: ビルド成果物（例: `.output/chrome-mv3`）
  - **生成物なので直接編集しない**

---

## Commands（コピペで通す）
### Setup / Dev
- Install deps: `yarn install`
- Dev (Chrome): `yarn dev`
- Dev (Firefox): `yarn dev:firefox`

### Quality gates（Definition of Done）
- Build (Chrome): `yarn build`
- Build (Firefox): `yarn build:firefox`
- Lint + typecheck: `yarn lint`
- Format（必要時）: `yarn format`（対象は基本 `entrypoints/**` と `shared/**`）
- E2E: `yarn build` → `yarn e2e`

---

## Code style / Naming（判定できるルール）
- TypeScript + React 19
- CSS は UnoCSS ユーティリティを優先（局所スタイルは最小）
- Biome: 2スペース、シングルクォート、必要時のみセミコロン（`yarn lint` に従う）
- コンポーネント: PascalCase（例: `Popup.tsx`）
- フック: `useXxx`（camelCase）
- テスト: `*.spec.ts`
- `any` は避ける（Biome の警告・エラーを優先して解消）

---

## Change guidelines（迷いやすいポイント）
- **`.output/**` は生成物**：編集対象にしない（元は `entrypoints/` / `shared/` / `public/` 等）
- 既存のパターンを踏襲：
  - UI/状態管理は既存の hooks / Zustand stores をまず探す
  - 同じ種類の処理がある場合、既存実装をコピーして差分最小で変更
- 依存追加・置き換えは影響が大きい：
  - **新規依存の追加は、まず目的と代替案を短く説明してから**
- ユーザー向け文字列は原則 i18n 化（ハードコードを避ける）

---

## Testing notes（E2Eの前提）
- Playwright は `e2e/` 配下
- `fixtures.ts` の拡張 `test` / `expect` を使用
- 非決定的挙動やネットワーク依存は最小化（フレークの原因になる）

---

## Docs / i18n（追加・変更手順の原則）
- i18n 追加は **両方** 更新：
  - `shared/i18n/assets`
  - `public/_locales`
- UI 変更は必要ならスクリーンショットを添付（差分が分かるもの）

---

## Security / Privacy（最低限の守り）
- 秘密情報やトークンをハードコードしない（ログ出力も含む）
- `dangerouslySetInnerHTML` は避ける（XSS対策）。やむを得ない場合は根拠と対策を明記
- 権限（permissions / host_permissions）の追加・拡大は勝手に行わない（必ず一言確認）

---

## Guardrails（危険操作：明示依頼がない限りやらない）
- 破壊的コマンド（`git reset --hard` / `git checkout --` / `rm -rf`）は勝手に実行しない
- 履歴書き換え（rebase / force push / amend）は明示依頼がない限りしない
- 大量のファイル移動・リネームは、目的と影響範囲を先に説明してから

---

## Truthfulness / 確認ルール（幻覚対策）
- 存在しない関数・設定・コマンドを作らない
- 不確実なら `rg` で検索して「根拠（該当箇所）」を見つけてから作業する
