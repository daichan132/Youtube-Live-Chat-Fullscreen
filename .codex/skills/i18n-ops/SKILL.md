---
name: i18n-ops
description: i18n workflow. Use when asked to add/update translations/locales/strings, or mentions i18n/locales/翻訳/文言/chrome.i18n/_locales.
metadata:
  short-description: Add/update i18n strings safely
---

# Goal
- Add or update user-visible strings with consistent keys and locale updates.

# Inputs (ask only if missing)
- The UI text (source language) and where it appears (screen/feature).
- Key naming preference if the project has one (otherwise infer from existing keys).

# Steps
1. Find existing patterns
   - Search for the same/similar text or key via `rg`
2. Add/update the key in the shared assets
   - `shared/i18n/assets`（既存構造に合わせる）
3. Add/update extension locale files
   - `public/_locales`（Chrome/Firefox分の運用があればそれに従う）
4. Update the UI usage
   - Hard-coded文字列を避けて i18n を参照
5. Consistency checks
   - Placeholder（例: `{name}`）は全localeで同じ名前にする
   - 余った未使用キーを増やさない（必要なら削除・整理）
6. Verify
   - `yarn lint`
   - `yarn build`（必要なら `yarn build:firefox`）

# Guardrails
- ユーザー向け文字列を `entrypoints/**` に直書きしない（例外はコメントで理由を書く）
- 翻訳が不完全でも、少なくとも既存の fallback 規約に従う

# Output format
- Added/updated keys list
- Files changed（`shared/...`, `public/_locales/...`）
- Verification commands and results
