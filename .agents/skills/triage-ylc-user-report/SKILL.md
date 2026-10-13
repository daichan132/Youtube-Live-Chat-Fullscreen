---
name: triage-ylc-user-report
description: "Diagnose YouTube Live Chat Fullscreen bug reports and compatibility failures. Use for report triage before a fix."
---

# YLC user-report triage

Turn a report into an evidence-backed diagnosis and the next check that can distinguish its likely causes. Reviews establish symptoms and priority; they do not establish root cause.

## Scope and authority

Use the current repository and its `AGENTS.md`. Read architecture or testing docs only for the boundary being investigated; use `docs/maintainers/verification-browser.md` when inspecting a real browser and `docs/maintainers/runtime-failure-diagnostics.md` for unexpected-runtime reports. Reuse material already read for this task. Current code and repository docs override historical pattern cards.

Triage is read-only by default. If the user also requested a fix, continue through implementation and verification within that authorization; a diagnosis packet is a handoff, not a mandatory approval stop. Posting replies, closing Issues, or publishing requires authorization for that action.

## Diagnose from the supplied evidence

Keep observed facts, inferences, and unknowns distinct. Reopen a referenced Issue or review when its current contents or status matter. Classify only as far as evidence supports: product defect, compatibility, YouTube drift, environment, feature request, insufficient evidence, or spam. For multiple reports, look for shared version, browser, video mode, timing, and symptom boundaries before assuming independent bugs.

Choose a few plausible hypotheses, with a suspected boundary, supporting facts, and a falsifying observation for each. Pick the cheapest check that separates them. For absent or disabled UI, distinguish source availability, user enable intent, runtime readiness, and loaded build identity before attributing a cause; use [report-intake.md](references/report-intake.md) for this branch. Do not ask again for fields already supplied or make every report follow an isolation checklist.

Use the built-in sanitized diagnostics for generation, status, leases, failure codes, probe IDs, and `failureStage`. A code routes investigation; preceding events determine whether pending or retry states are expected. Do not request or copy private URLs, video IDs, chat text, user names, or raw exception/console dumps into a diagnosis.

## Load only the relevant guidance

| Need | Reference |
| --- | --- |
| Missing information that separates hypotheses | [report-intake.md](references/report-intake.md): symptom-directed questions and matched isolation |
| An unresolved cause or several symptoms at one boundary | [failure-patterns.md](references/failure-patterns.md): read the relevant cards, not the whole catalog |
| Provenance for a historical pattern, or requested evidence maintenance | [source-register.md](references/source-register.md): dated, anonymized evidence; no automatic refresh |

Choose evidence for the claim: core/DOM checks for state and storage, typed fixture E2E for lifecycle and pointer routing, package contracts for artifacts, and canaries for current YouTube compatibility. Paint or compositor claims require pixels in the affected engine; DOM presence and hit testing do not prove paint. Hardware claims may need reporter-assisted traces.

## Finish with an actionable diagnosis

Report the affected scenario, observed facts, leading hypotheses, unresolved uncertainty, and the smallest next check. Include a reproduction sequence and required test/browser evidence when a fix is being planned. Do not infer severity or cause from stars, helpful counts, or Issue state, and do not invent a patch before evidence discriminates causes.

Triage is complete when the next action is justified, or when the missing evidence and why it matters are precise. If a fix was requested, preserve the original trigger and expected behavior for [verify-ylc-change](../verify-ylc-change/SKILL.md) and continue the authorized work.
