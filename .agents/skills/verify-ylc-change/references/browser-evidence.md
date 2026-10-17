# Browser and artifact evidence

Use this when verification depends on the loaded extension, real input, paint, authentication, or a browser engine. Follow the current repository's `docs/maintainers/verification-browser.md` for launch commands, output paths, and profile defaults.

## Identify what is running

- Confirm the extension entry, version, and exact output path in the intended dedicated profile. An app name, process arguments, or an open page alone does not prove the extension loaded. Multiple windows of one app can belong to different profiles.
- After changing a content bundle, reload the extension and target page, then confirm a current YLC artifact in the expected state. Reusing a launch process navigates the page but does not necessarily reload the extension; the same path and version can still refer to stale code. If identity remains ambiguous, compare a current content-bundle filename or hash.
- A dev output requires its matching WXT dev server. Do not use a dev bundle as a standalone production build or trust an unrelated localhost server. Keep one writer per output directory: concurrent WXT servers can mix generated files even when they listen on different ports. Match the output directory, owning process, manifest development endpoints, and background WebSocket endpoint to the intended server. If mixed output is found, stop only the identified task-owned conflicting processes, regenerate with one server, then reload the extension and page. Do not rebuild into an output directory while a measurement uses it; record bundle identity before and after long runs.
- Keep testing output and production ZIPs separate. An exact-package smoke must load the ZIP being assessed; record its identity rather than inferring it from a fixture build.

Use Chrome for Testing for isolated verification. For authentication-dependent UI, use the dedicated normal-Chrome profile from the repository runbook. Normal Chrome 137+ does not establish unpacked-extension loading through `--load-extension`; confirm the extension in `chrome://extensions` and its current content artifact.

## Interpret absent or disabled UI

Match the intended page, profile, and build first. Missing overlay DOM outside fullscreen is normally expected. Then distinguish the state that determines presentation:

| Observed boundary | What the evidence supports |
| --- | --- |
| Confirmed no-chat or replay-unavailable | Absent presentation may be correct; no-chat can have no YLC root or switch in fullscreen. A blank or loading iframe alone does not confirm this mode. |
| YLC explicitly off | Apply the user-off contract; a switch or native chat can remain while the overlay is absent. |
| Incomplete capabilities or loading iframe | Initially disabled controls can be pending. Observe sanitized status, probes, and bounded events until convergence or a concrete failure; persistent pending needs investigation, not indefinite waiting or longer retries. |
| Settled usable source, YLC enabled, expected presentation missing | Treat the missing UI as an extension failure and investigate the responsible boundary. |

The current `verify:overlay` helper expects DOM from fullscreen alone. Exit 2 is not installation proof, and exit 0 proves only YLC DOM presence. Select the current route explicitly with `--url-includes`; the default watch match can miss live-entry routes or inspect another tab. Confirm its returned page locally and summarize fields because the output includes a raw URL.

Old sample videos can disappear. A replacement source can establish tool operation or current compatibility, but cannot replace the original reported reproduction. Playback errors and readable chat can coexist: qualify video playback, native chat, YLC presentation, and input evidence separately.

## Match input and pixels to the claim

Preserve the original page mode and trigger: direct load or SPA, overlay off/on, fullscreen exit/re-entry, or player/iframe replacement as relevant. Repeat transitions when the symptom is intermittent. This is a scenario menu, not a requirement to exercise every transition for every change.

Use real pointer/keyboard input for interaction and focus claims. Refresh UI targets after ads, SPA, and fullscreen transitions. Autoplay can change the source while you inspect another surface; recheck the page identity and pause or disable autoplay in a disposable profile when a stable comparison needs it. Assert the action's specific postcondition and context: closing settings while also exiting fullscreen does not establish dismissal or focus behavior inside retained fullscreen. For persistence, reopen or re-enter and check the selected value, rather than inferring storage from the initial click. Re-entry proves retention across that transition; durable storage additionally needs a reload or restart matched to the claimed lifetime.

Capture pixels for compositor, blur, brightness, clipping, or perceived motion in the affected engine. A Chromium fixture or Firefox ZIP build cannot establish Firefox/Zen/Brave paint behavior. For visual snapshots, follow the repository's platform policy; do not regenerate Linux baselines on macOS. For video brightness or hardware effects, use matched before/after frames or traces where feasible; a single DOM or memory snapshot is insufficient.

## Choose a source for controlled lifecycle evidence

A headed browser with a production extension can still use intercepted YouTube fixture content. That proves controlled product behavior, separately from current YouTube compatibility or authentication. The existing production smoke covers popup and a live fixture; it does not establish archive, no-chat, or untouched default paint because visual setup can stabilize fonts and CSS.

When live-entry resolution, iframe restoration, or no-chat expectations need an independent production-bundle check, the current repository supports:

```bash
yarn build
YLC_EXTENSION_OUTPUT_DIR=.output/chrome-mv3 \
YLC_REQUIRE_E2E_BRIDGE=0 YLC_E2E_HEADED=1 \
yarn playwright test --project=fixture \
  e2e/scenarios/live/channelLiveEntry.fixture.spec.ts \
  e2e/scenarios/archive/borrowRestore.fixture.spec.ts \
  e2e/scenarios/live/noChatVideo.fixture.spec.ts \
  --retries=0 --workers=1
```

This uses disposable profiles and the ordinary production storage fallback. Select only relevant scenarios; it is not an extra gate for every change. For an exact-ZIP check, use `yarn prepare:production-smoke` and its extracted `.output/production-smoke/chrome` artifact instead; confirm current repository support before adapting the command.

If a required browser, login, source, or hardware is unavailable, state the missing boundary and complete independent deterministic work. Do not convert an extension failure to an external-precondition skip or claim adjacent evidence proves the unavailable case.
