# AGENTS.md + Skills (まとめ)

## AGENTS.md

```markdown
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
```

## .codex/skills/e2e-playwright/SKILL.md

```markdown
---
name: e2e-playwright
description: Playwright E2E workflow for this extension. Use when E2E fails or is flaky, or mentions Playwright/e2e/fixtures/spec/trace/PWDEBUG.
metadata:
  short-description: Debug Playwright E2E tests
---

# Goal
- Reproduce, debug, and fix Playwright E2E failures with minimal flakiness.

# Inputs (ask only if missing)
- Which spec to focus on (file name / test title / failing step).
- Target build (Chrome/Firefox) if relevant.

# Steps
1. Ensure build artifact exists (E2E前提)
   - `yarn build`
2. Run E2E
   - `yarn e2e`
3. If you need to focus on a single test/spec
   - Try passing Playwright args through yarn:
     - `yarn e2e -- <args>`（例: `yarn e2e -- e2e/foo.spec.ts`）
   - If pass-through is not supported, run Playwright directly (repoの慣習に合わせる)
4. Gather debugging artifacts (when failing)
   - Prefer Playwright trace/screenshots/video if enabled in config
   - Re-run once to confirm determinism (no infinite retries)
5. Fix strategy (flakinessを増やさない)
   - Avoid sleep/timeouts; wait on explicit UI/state:
     - `await expect(locator).toBeVisible()`
     - `await expect(locator).toHaveText(...)`
   - Use stable selectors (role/text/testid など、プロジェクトの既存パターンに合わせる)
   - Network依存はfixturesで置き換える（可能なら）
6. Validate
   - `yarn e2e` が連続で通ることを確認（最低2回が理想）

# Notes
- `e2e/fixtures.ts` の拡張 `test/expect` を使う前提。
- 非決定的挙動を増やす修正（ランダム待ち/過剰リトライ）は避ける。

# Output format
- Repro steps（実行したコマンド）
- Root cause（推定でなく根拠ベース）
- Fix summary（どこをどう変えたか）
- Verification（通ったコマンド）
```

## .codex/skills/extension-debug/SKILL.md

```markdown
---
name: extension-debug
description: Debug browser extension behavior. Use when asked to debug/reproduce extension issues in Chrome/Firefox, or mentions content script/popup/service worker/manifest/permissions.
metadata:
  short-description: Debug Chrome/Firefox extension issues
---

# Goal
- Reproduce and debug issues in the extension with clear logs and minimal guesswork.

# Inputs (ask only if missing)
- Where the issue occurs: content script / popup / background (service worker) / options page.
- Browser: Chrome, Firefox, or both.
- Repro steps (URL, actions) if not provided.

# Steps
1. Build/run in dev mode
   - Chrome: `yarn dev`
   - Firefox: `yarn dev:firefox`
2. Load/refresh the extension in the browser
   - Use the built output under `.output/` (e.g., `.output/chrome-mv3`) as the load-unpacked target
   - After rebuild: reload extension + reload the target page
3. Collect the right console logs
   - Popup: open popup, inspect its console
   - Content: open target page devtools console (content script logs)
   - Background/SW: open extension detail page and inspect the service worker console
4. Narrow down the entrypoint and file
   - Use `rg` for the feature/keyword and follow imports into `shared/`
5. Validate suspected fix
   - `yarn lint`
   - `yarn build`（and/or `yarn build:firefox`）
   - If behavior-level: `yarn e2e`

# Guardrails
- Permissions/host_permissions changes are sensitive: ask before changing.
- Avoid adding noisy logs; keep debug logs behind a guard if needed.

# Output format
- Repro steps (exact)
- Observed logs/errors (short excerpt)
- Suspected root cause (with file pointers)
- Proposed fix + verification commands
```

## .codex/skills/git-ops/SKILL.md

```markdown
---
name: git-ops
description: Safe git workflow for Codex. Use when asked to stage/commit/branch/revert/inspect changes, or mentions コミット/差分/ブランチ or "git add/commit/status/diff/switch/revert".
metadata:
  short-description: Safe git operations workflow
---

# Goal
- Perform safe, minimal git operations (inspect, stage, commit, branch, revert) without destructive history rewrites.

# Inputs (ask only if missing)
- The exact action requested (inspect / stage / commit / branch / revert / undo local changes).
- Commit message (if a commit is requested).
- Target paths (if the request is broad).
- If the user asks to "undo": whether to undo *staged*, *unstaged*, or a *committed* change.

# Non-goals
- Do not rewrite history or use destructive commands unless explicitly requested:
  - No `git reset --hard`, no force push, no implicit amend/rebase.
- Do not discard local changes (`git restore <path>`) unless the user explicitly asks to discard *those exact files*.

# Steps
1. Inspect current state
   - `git status -sb`
   - If needed: `git diff` and `git diff --staged`
2. If staging is requested
   - Stage only requested paths.
   - Prefer smallest possible scope:
     - Use `git add -p <path>` when partial staging is safer.
3. If commit is requested
   - Ensure staged content is what we intend: `git diff --staged`
   - Commit with the provided message: `git commit -m "<message>"`
   - (No amend unless explicitly asked.)
4. If branching is requested
   - Create: `git switch -c <branch>`
   - Switch: `git switch <branch>`
5. If revert is requested (safe undo for shared history)
   - Prefer `git revert <sha>` over reset.
6. Finish by confirming state
   - `git status -sb`

# Safety checks
- If there are unrelated changes, do not touch them; mention them and continue only with requested files.
- If unexpected changes appear (not explained by the task), stop and ask how to proceed.
- Never delete files or reset history unless the user explicitly asks.

# Output format
- What was inspected (paths / branch).
- What was staged (paths) and/or committed (hash + message).
- Any remaining dirty files (unstaged/untracked/staged).

# Trigger examples
- "コミットして"
- "git add して"
- "差分を確認して"
- "ブランチを切って"
- "このコミットを取り消したい"
```

## .codex/skills/i18n-ops/SKILL.md

```markdown
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
```

## .codex/skills/pr-review/SKILL.md

```markdown
---
name: pr-review
description: PR/code review checklist for this extension. Use when asked to review a PR/change, or mentions review/コードレビュー/PR/チェック.
metadata:
  short-description: Extension PR review checklist
---

# Goal
- Provide a focused, actionable review for changes in this browser extension.

# Inputs (ask only if missing)
- What the change is supposed to do (1–2 sentences).
- Any risk areas (permissions, network, auth, i18n, E2E).

# Steps
1. Summarize intent & affected areas (entrypoints/shared/e2e/public)
2. Review checklist
   - Correctness: edge cases, error handling
   - Type safety: no `any`, types make sense
   - Style: Biome expectations, naming conventions
   - Security: XSS, `dangerouslySetInnerHTML`, token/PII logging, permissions
   - Cross-browser: Chrome/Firefox differences, API usage assumptions
   - i18n: strings not hard-coded, locales updated
   - Tests: updated/added specs, E2E stability
3. Provide concrete suggestions
   - Point to exact files/lines or propose small diffs

# Output format
- ✅ Good points (brief)
- ⚠️ Risks / questions (brief)
- 🔧 Requested changes (actionable, prioritized)
- 🧪 Suggested verification commands
```

## .codex/skills/quality-gates/SKILL.md

```markdown
---
name: quality-gates
description: Run repo quality gates. Use when asked to run tests/lint/build/CI checks, or mentions "lint/typecheck/build/e2e/Playwright/CI" or "動作確認/テストして".
metadata:
  short-description: Run lint/build/e2e safely
---

# Goal
- Run the right quality gates (lint/build/e2e) for the current change and summarize results.

# Inputs (ask only if missing)
- Target browser build: Chrome only, Firefox only, or both.
- Whether E2E is required (UI/behavior change usually => yes).

# Steps
1. Inspect what changed
   - `git status -sb`
   - If needed: `git diff --name-only`
2. Always run lint/typecheck for code changes
   - `yarn lint`
3. Build
   - Chrome: `yarn build`
   - Firefox (if requested / relevant / uncertain): `yarn build:firefox`
4. Format only when needed (formatting churnを最小化)
   - `yarn format`（基本 `entrypoints/**` と `shared/**`）
5. E2E when behavior/UI or e2e specs changed
   - `yarn build` → `yarn e2e`
6. Summarize pass/fail and next actions

# Edge cases
- If E2E fails/flaky, switch to the `e2e-playwright` skill to debug (trace/screenshots/etc).
- If builds differ between Chrome/Firefox, call it out explicitly and propose a compatibility fix.

# Output format
- Commands executed
- Result summary (pass/fail + key error excerpt)
- What to do next (exact command or file to inspect)
```

## .codex/skills/skill-builder/SKILL.md

```markdown
---
name: skill-builder
description: Create or update Codex Skills (SKILL.md). Use when asked to make/update a skill, add SKILL.md, skill template, or mentions Codex skills / Agent Skills / スキル作成.
metadata:
  short-description: Create/update Codex skills
---

# Goal
- Design and create a small, triggerable, safe Codex Skill.

# Inputs (ask only if missing)
- Purpose: what task the skill should help with (one sentence).
- Trigger situations/keywords (Japanese/English).
- Scope: repo-local (`.codex/skills/`) or user-wide (`~/.codex/skills/`).

# Design principles
- One skill = one job (single responsibility).
- `description` is the trigger surface:
  - Keep it single-line, concise.
  - Include: "Use when ..." + concrete keywords.
- Keep SKILL.md short:
  - Goal / Inputs / Steps / Output format / Edge cases / Trigger examples.
  - Long details go to `references/` instead of bloating the body.
- If the skill feels wrong during use, fix it immediately (minimal change).

# Steps
1. Pick a kebab-case name (1–64 chars) and create the folder with the same name.
2. Write a single-line `description` that:
   - States when to use the skill
   - Contains 4–10 trigger keywords (terms users actually say)
3. Draft the SKILL.md sections:
   - Goal
   - Inputs (ask only if missing)
   - Non-goals / Guardrails
   - Steps (commands or deterministic process)
   - Output format (exactly what to return)
   - Edge cases
   - Trigger examples (2–6)
4. Check overlap:
   - If it overlaps with existing skills, split or narrow description.
5. (Optional) If scripts are required:
   - Put them under `scripts/`
   - Document usage, dependencies, and failure modes clearly.
   - Otherwise keep instruction-only.

# Output format
- File path(s) created/updated.
- Short explanation of triggers and what the skill will do.
- Any open questions (only if truly required).

# Trigger examples
- "skills を作って"
- "SKILL.md を追加して"
- "Agent Skills のテンプレ作って"
- "この作業をスキル化したい"
```
