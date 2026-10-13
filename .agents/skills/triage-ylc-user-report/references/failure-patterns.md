# YLC field-failure patterns

Use relevant cards to route symptoms to falsifiable boundaries. Candidate checks help choose the next discriminating evidence; they are not an unconditional test suite. Current source and repository contracts govern verification after a fix. Historical causes and selectors require current confirmation.

## Contents

- [P01 State collapse](#p01-state-collapse)
- [P02 SPA generation drift](#p02-spa-generation-drift)
- [P03 Borrowed-resource restoration](#p03-borrowed-resource-restoration)
- [P04 YouTube DOM and rollout drift](#p04-youtube-dom-and-rollout-drift)
- [P05 Interaction and ancestor CSS](#p05-interaction-and-ancestor-css)
- [P06 Compositor, blur, and actual paint](#p06-compositor-blur-and-actual-paint)
- [P07 Third-party and environment conflicts](#p07-third-party-and-environment-conflicts)
- [P08 Persisted settings and geometry](#p08-persisted-settings-and-geometry)
- [P09 False-green verification](#p09-false-green-verification)
- [P10 Performance, GPU, and hardware](#p10-performance-gpu-and-hardware)

## P01 State collapse

- **User symptoms:** the switch disappears or turns itself off; live works but replay does not; chat oscillates between loading and unavailable; several surfaces break after one release.
- **Discriminating conditions:** live/archive/no-chat mode, source readiness, native chat state, user intent, fullscreen state, transient duration.
- **Suspect boundary:** separate availability, operability, presentation, ownership, and retry state instead of compressing them into one Boolean or terminal gate.
- **Falsification:** the independent state fields remain correct through the complete transition while only rendering or interaction fails.
- **Avoid:** mapping `unknown` or `pending` immediately to unavailable; disabling the switch because the source is not ready; broadening test skips together with the runtime gate.
- **Candidate checks:** pure transition test plus deterministic live/archive/no-chat and transient-source fixtures.
- **Sources:** `GH-142`, `CWS-2026-01`, `COMMIT-d899a60`.

## P02 SPA generation drift

- **User symptoms:** the previous stream's chat remains; chat disappears after navigation; archive is misdetected as live or the reverse; a delayed callback changes the new video.
- **Discriminating conditions:** direct load versus A→B navigation, URL update order, same-URL video replacement, player/DOM/iframe identity, generation numbers, timer ownership.
- **Suspect boundary:** surface identity from URL and player/watch/native-chat evidence, observation generation, session scope, and release-before-acquire ordering. Channel-live URLs start without a video ID; accept candidates only when they resolve uniquely.
- **Falsification:** all callbacks and resources carry the current generation and the stale node never influences the decision.
- **Avoid:** trusting the first `#chatframe`; increasing polling; tearing down every navigation without identity checks; module-global timers or resource maps.
- **Candidate checks:** pure generation test plus SPA, player replacement, and stale-iframe fixture E2E.
- **Sources:** `CWS-2026-07`, `COMMIT-54be946`.

## P03 Borrowed-resource restoration

- **User symptoms:** native chat does not return; duplicate chat appears; overlay survives fullscreen exit; replay chat loses state after borrowing.
- **Discriminating conditions:** borrowed versus managed iframe, exact node identity, original slot availability, release order, repeated cleanup.
- **Suspect boundary:** lease ownership of the exact YouTube node and idempotent release that restores the borrowed resource before dismantling its host and continues cleanup if another owner throws.
- **Falsification:** the same node returns to the valid source slot and every release remains safe to repeat.
- **Avoid:** cloning, recreating, or removing a borrowed iframe; storing restoration state in a global map; destroying the presentation host before restoring the resource.
- **Candidate checks:** DOM ownership test plus borrow/restore, fullscreen-exit, and replacement fixtures.
- **Sources:** `COMMIT-a620ea6`.

## P04 YouTube DOM and rollout drift

- **User symptoms:** only some users lose the toggle; a side panel or black bar remains; no-chat videos show controls; old workarounds differ by account.
- **Discriminating conditions:** old/new DOM variant, account or A/B state, matched selector/probe ID, native expanded and usable state, `/watch` versus direct `/live/<videoId>` or channel-live entry routes (`/@name/live`, `/channel/<id>/live`, `/c/<name>/live`, `/user/<name>/live`).
- **Suspect boundary:** selector catalog, compatibility observation, pure decision model, and reversible layout ownership.
- **Falsification:** the expected probe matches and the observation is correct while a downstream owner fails.
- **Avoid:** scattering selectors; matching broad generic buttons; treating one local DOM shape as universal; closing because the developer account lacks the rollout.
- **Candidate checks:** typed old/new DOM fixtures and a current real-YouTube canary.
- **Sources:** `GH-162`, `CWS-2025-Q4`.

## P05 Interaction and ancestor CSS

- **User symptoms:** chat input, settings, drag, resize, menus, or Super Chat cannot be clicked; clicks pause the video; reactions or menus are clipped; native chat returns slowly.
- **Discriminating conditions:** real pointer target, ancestor `pointer-events`, `overflow`, `display`, `visibility`, stacking context, authentication surface.
- **Suspect boundary:** structural versus interactive layer ownership and narrowly scoped iframe/style responsibilities.
- **Falsification:** real pointer input reaches the intended interactive child and clipping/visibility ancestors remain valid.
- **Avoid:** DOM `.click()` as interaction proof; ancestor-wide `pointer-events: none`; broad `overflow: hidden`; hiding a live iframe with `display: none`; blanket `!important` patches.
- **Candidate checks:** DOM style contract plus pointer-driven fixture covering input, controls, drag, resize, click-through, menus, and lifecycle.
- **Sources:** `GH-164`, `CWS-2026-01`, `COMMIT-8e30840`.

## P06 Compositor, blur, and actual paint

- **User symptoms:** chat is behind the video despite correct DOM; video brightness changes; blur disappears; transparency becomes black; Firefox/Zen/Brave differs from Chrome.
- **Discriminating conditions:** affected engine, overlay off/on sequence, fullscreen re-entry, parent/player filters, `backdrop-filter`, transform/compositor promotion, actual pixels.
- **Suspect boundary:** keep visual effects inside the chat surface; avoid changing the parent video/player compositor surface.
- **Falsification:** pixel capture remains correct through repeated transitions in the affected engine while DOM ownership changes incorrectly.
- **Avoid:** using DOM presence, `z-index`, or hit testing as visual proof; assuming transparent full-viewport layers are GPU-neutral; declaring Firefox success from a successful package build.
- **Candidate checks:** style contract, deterministic visual check, repeated affected-browser cycles, and same-frame luminance or SSIM comparison when appropriate.
- **Sources:** `GH-006`, `GH-048`, `GH-215`, `GH-219`, `GH-221`, `GH-234`, `COMMIT-c31e7f1`, `COMMIT-1947404`.

## P07 Third-party and environment conflicts

- **User symptoms:** overlay never appears; a setting has no effect; transparency changes only with a theme; a fix appears only after browser restart.
- **Discriminating conditions:** actual loaded version, reload/restart state, isolated profile result, other extensions/userscripts, browser flags, themes, custom CSS.
- **Suspect boundary:** environment isolation first; add compatibility code only after identifying the other mutation.
- **Falsification:** the same failure occurs in a clean profile with the same build and action sequence.
- **Avoid:** blaming the reporter immediately; patching guessed third-party DOM before isolation; using a different URL or action sequence for the comparison.
- **Candidate checks:** matched normal-versus-isolated profile comparison, then binary search among extensions and a fixture for the confirmed conflict.
- **Sources:** `GH-012`, `GH-037`, `GH-112`, `GH-215`, `CWS-EXTENSIONS`.

## P08 Persisted settings and geometry

- **User symptoms:** settings revert on startup; another tab's changes disappear; a legacy preset is lost; drag/resize jumps, moves the opposite edge, or saves off-screen.
- **Discriminating conditions:** initialization ordering, external writes, writer identity, migration version, player rectangle, draft versus committed geometry, dependent-setting visibility.
- **Suspect boundary:** watch-before-load buffering, normalized repository writes, non-destructive legacy compatibility reads, explicit import/migration when applicable, player-relative geometry, operation-end persistence, and preserved dependent values.
- **Falsification:** storage events, migration, and player-relative draft/commit remain coherent while only presentation is wrong.
- **Avoid:** persisting defaults before load; deleting legacy data before read-back; writing every pointer move; mixing viewport and player coordinates; clearing child values when a parent setting is off.
- **Candidate checks:** repository/migration core tests, multi-context DOM synchronization, and pointer-driven geometry fixture.
- **Sources:** `COMMIT-591ff33`, `COMMIT-e6e7cc4`.

## P09 False-green verification

- **User symptoms:** CI is green but the extension is broken; all important canaries skip; settings opens then immediately closes; browser shows old behavior after a code change.
- **Discriminating conditions:** executed/skipped counts, external precondition versus extension failure, loaded extension path/profile/revision, click convergence, production versus testing artifact.
- **Suspect boundary:** test classification, deterministic fixtures, action contracts, and artifact identity.
- **Falsification:** the intended artifact is proven loaded, the original scenario executes without skip or retry, and the post-action state converges correctly.
- **Avoid:** expanding skip/retry/timeout; force-clicking past a broken pointer path; relaxing runtime and expected behavior together; trusting process arguments as load proof.
- **Candidate checks:** classification contract, zero unexpected skips, deterministic reproduction, and explicit bundle/profile/page identity.
- **Sources:** `CWS-2026-01`, `COMMIT-e97c162`.

## P10 Performance, GPU, and hardware

- **User symptoms:** memory grows, the player freezes periodically, chat loads very slowly, or an NVIDIA/browser media feature is disabled by the overlay.
- **Discriminating conditions:** baseline without YLC, elapsed timeline, memory/CPU/GPU trace, message volume, other extensions, browser/driver/GPU model, reproducibility.
- **Suspect boundary:** first determine whether runtime, rendering, external chat, browser compositor, or hardware detection owns the cost.
- **Falsification:** controlled traces show no material YLC delta or the behavior follows another extension/browser state.
- **Avoid:** inferring a leak from one snapshot; shipping speculative compositor or hardware patches without relevant equipment; increasing timeouts without a timing trace.
- **Candidate checks:** controlled before/after trace, repeated timeline, and reporter-assisted hardware verification when local hardware is unavailable.
- **Sources:** `GH-156`, `CWS-PERFORMANCE`.
