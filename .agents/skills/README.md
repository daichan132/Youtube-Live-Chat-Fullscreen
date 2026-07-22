# Project skills

This directory contains two kinds of skills. Keep their ownership separate so
upstream refreshes do not overwrite project-specific behavior.

## Project-maintained skills

| Skill | Responsibility |
| --- | --- |
| `fullscreen-chat-contracts` | Runtime contracts for fullscreen, native chat, iframe ownership, blur, and background behavior. |
| `git-pr-ops` | Repository-specific Git, validation, and PR conventions. |
| `ylc-agent-browser` | Manual verification on real YouTube pages. Use this instead of Playwright for visual and computed-style checks. |
| `ylc-e2e-playwright` | Repository-specific Playwright E2E workflows and live/archive/no-chat fixtures. |
| `chrome-extension-e2e-playwright` | Generic MV3 and Playwright reference maintained alongside this extension's E2E infrastructure. |

When both a generic and a YLC-specific skill apply, start with the YLC-specific
skill and follow its routing to the generic reference only when needed.

## Externally managed skills

These skills are recorded in [`skills-lock.json`](../../skills-lock.json) and
must be refreshed from their upstream source rather than edited locally:

- `agent-browser`
- `find-skills`
- `skill-creator`
- `vercel-react-best-practices`

Inspect and refresh them with:

```sh
npx skills list --json
npx skills update -p -y
```

If a legacy entry has no `skillPath`, reinstall that one explicitly with
`npx skills add <owner/repository@skill> -y` before retrying the update.

## Maintenance rules

- Do not add project-maintained skills to `skills-lock.json`.
- Do not make repository-specific edits inside externally managed skills.
- Remove lock entries when the corresponding installed skill is intentionally removed.
- Validate every `SKILL.md` after an external refresh and review the resulting Git diff before committing.
