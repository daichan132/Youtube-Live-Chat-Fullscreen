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
