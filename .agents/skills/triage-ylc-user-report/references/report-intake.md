# Minimal report intake

Ask only for information that distinguishes the current leading hypotheses. Do not turn every report into a fixed questionnaire.

## Baseline fields

Reuse fields already supplied by the report or repository Issue template:

- observed versus expected behavior;
- reproduction steps;
- YouTube video state;
- browser and version;
- extension version;
- operating system;
- sanitized screenshot or recording.

## Symptom-directed questions

| Symptom | Ask only when missing |
| --- | --- |
| Overlay absent or switch disabled | Was this live, replay, replay-unavailable, or no-chat? Was the actual published/dev build confirmed loaded? What did native chat show before fullscreen? Was YLC enabled, and did the current capabilities settle? |
| Previous or stale chat | Was the second video opened through SPA navigation or a fresh URL? What was the A→B sequence? Did reload change it? Do diagnostic generations or leases change? |
| Input, settings, drag, or menu unclickable | Which exact surface fails? Does the underlying video receive the click? Does keyboard input work? Is login required for the surface? |
| Blur, brightness, black background, or chat behind video | Which browser engine and version? Does it survive overlay off/on and fullscreen exit/re-entry? Can equivalent before/after pixels be captured? |
| Only one browser or profile fails | Does the same action sequence fail in an isolated profile? Which YouTube extensions, userscripts, themes, custom CSS, or experimental settings are active? |
| Slow load, freeze, or memory growth | What is the baseline without YLC? Over what time and chat volume? Is there a memory, performance, or GPU trace rather than one snapshot? |
| Setting reverts or geometry jumps | Did the value come from old settings, import, or a fresh install? Does it cross tabs or restart? At what pointer operation or player resize does it commit? |
| Generic "doesn't work" | Request the smallest reproducible action, video state, browser/version, extension version, and whether an isolated profile changes the result. Continue independent source or fixture investigation while waiting; ask follow-ups only when they distinguish hypotheses. |

## Absent or disabled UI in a real browser

Check the current page mode and native source before interpreting YLC absence. Confirmed no-chat can legitimately have no YLC root or switch even in fullscreen. An unavailable archived example is evidence about that source; choose another current source for a tool or compatibility check while retaining the original report's reproduction boundary.

Separate user-off from missing capability and settled failure. Controls may be disabled while an iframe loads; use sanitized status, probes, and bounded events to observe convergence or a concrete failure rather than classifying the first fullscreen frame. A blank or not-yet-loaded chat alone does not establish no-chat. Playback failure and readable native chat can coexist, so qualify chat/UI evidence separately from video playback evidence.

When using the repository inspector, select the intended route with `--url-includes` and confirm its returned page locally. Autoplay can advance the video while another surface is inspected; hold the source stable in a disposable profile when comparing states. The default watch match can miss a live-entry route or choose another tab. Its current fullscreen-only DOM expectation makes exit 2 insufficient proof of a missing installation; exit 0 proves DOM presence, not working playback, input, or paint. Its output contains the raw page URL: summarize anonymous fields instead of copying the output into a diagnosis.

## Matched isolation when environment or third-party state is plausible

Keep URL, browser version, extension build, and action sequence identical between comparisons. Choose the relevant checks below; do not reset user settings or use a normal profile for an isolation test.

1. Confirm the loaded extension entry and version.
2. Reload the extension and target tab; restart the browser only when stale state remains plausible.
3. Reproduce in a dedicated isolated profile with only YLC enabled.
4. If isolation fixes the issue, enable other extensions or userscripts by binary search.
5. Record the confirmed mutation before proposing a compatibility fixture or patch.

Do not call either side "the cause" before the matched comparison finishes.

## Sanitized diagnostics

Prefer the built-in report fields:

- extension version and browser family;
- page mode, fullscreen state, capabilities, and probe IDs;
- runtime generation, status, leases, failure code, and failureStage;
- compatibility state and bounded events.

Do not request or reproduce raw video IDs, private URLs, chat text, usernames, account identifiers, raw exceptions/stacks, or an unbounded console dump. If a supplied artifact contains them, summarize only the minimum anonymous facts needed for diagnosis.
