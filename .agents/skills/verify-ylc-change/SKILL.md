---
name: verify-ylc-change
description: "Verify a YouTube Live Chat Fullscreen fix or code, configuration, or dependency change. Use during review or implementation."
---

# Verify a YLC change

Prove behavior affected by the current diff, including the original failure sequence when one exists. Choose evidence for the claim being made; do not expand every change into a release audit.

## Establish the target and completion

Use the current checkout, `AGENTS.md`, diff, and expected behavior. Preserve unrelated changes. Reuse a triage packet if available; dependency or configuration updates can use the affected contract as their anchor without inventing a bug reproduction.

Use `docs/testing/contracts.md` for required gates and commands, architecture docs for changed ownership boundaries, and `docs/maintainers/verification-browser.md` for real-browser procedures. Read only what the task needs and reuse documents already read. Repository requirements take precedence over these references.

Verification includes local tests, builds, and disposable browser fixtures. Continue through required checks without a separate approval at each step, subject to environment permissions. When implementation is authorized, fix regressions caused by the requested change and rerun affected checks; a review-only request reports failures without silently changing the implementation. Commit, push, external replies, and publication follow the user's existing authorization.

## Select the evidence

Identify the changed invariant and lifecycle transitions that could invalidate it. Read relevant rows in [risk-routing.md](references/risk-routing.md) when choosing evidence across boundaries. Preserve live/archive/no-chat distinctions, current session generations, and restoration of borrowed YouTube resources where those contracts are affected.

Use focused checks while iterating, then complete the repository gates required for this change (`yarn verify` for ordinary code/dependency changes). Package, manifest, locale inventory, or build-tool changes also require fresh Chrome and Firefox production packages and their contracts. Testing-build success alone does not prove production-package behavior.

For loaded-build identity, authentication, compositor, or engine-specific behavior, use [browser-evidence.md](references/browser-evidence.md). For suspicious greens, skips, retries, stale bundles, or mismatched claims, use [verification-traps.md](references/verification-traps.md). These are conditional references, not extra mandatory suites.

## Evidence that cannot be substituted

- Deterministic fixtures own product behavior; real-YouTube canaries own external compatibility drift. Skip only external preconditions. Missing expected YLC UI is a failure when the source is usable, YLC is enabled, fullscreen is active, and the relevant runtime state has settled. Establish those prerequisites from current evidence; no-chat and user-off have different presentation contracts.
- Pointer and keyboard interaction claims require real input. Paint claims require pixels in the affected engine; DOM presence, `z-index`, and hit testing are insufficient.
- An all-skipped run, an unavailable command, another revision's results, or increased retries/timeouts do not prove this change. Keep an independent anchor when modifying both runtime behavior and assertions.

## Complete and report

Continue until applicable required checks pass or a concrete external limitation prevents further verification. Do not add unrelated repairs or repeat successful suites without new changes or unresolved concerns.

Report what was verified, the current diff/artifact, commands and outcomes, and material limitations. Include executed/skipped/failed/retried counts for browser runs and loaded build/profile identity when using a real browser. Distinguish baseline warnings and unrelated failures from regressions. Claim completion only for boundaries with current evidence; name any required boundary still unverified.
