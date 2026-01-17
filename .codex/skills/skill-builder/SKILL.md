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
