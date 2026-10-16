# Store asset verification — 2026-10-13

The real-stream assets show the **published 2.3.15 extension** in regular Chrome. The local **2.3.16 production candidate**, at source commit `dc65af1d791e9e7e8a2493c9203a355111656769`, was checked separately on a deterministic fixture. Runtime code was not changed for this refresh, and the public listing has not been updated.

## Real YouTube observations

### Selected English stream

In a separate regular-Chrome window using the published **2.3.15** extension, the selected public archive played with video `readyState: 4` and **1920 × 1080** source dimensions. Native English chat-replay messages populated the extension overlay. Extension files and the injected content host/style markers were observed; the extension-manager page was blank, so manager-based identity verification was unavailable in this profile.

Earlier captures with white padding or an oversized chat were rejected. The user adjusted the chat to a compact upper-right position, leaving the central content and the creator's face visible. In the accepted capture session, the player reported fullscreen and the video rendered at its native aspect ratio. Native browser clips use **1600 × 900**, with the surrounding player matte omitted and at most two pixels of edge alignment rounding. The complete chat panel and creator remain inside each capture.

The published control rail enables its buttons while the pointer is over the chat's outer controls. The earlier disabled-button observation was a hover-state issue, not evidence of failed chat initialization. Real pointer gestures moved the chat from right to left and resized it to **400 × 512**. Video playback and populated chat replay were observed; after seeking and playing a later section, both the video position and replay messages progressed. Exact synchronization latency was not measured.

The actual settings button created a blank settings iframe in this profile. Appearance and preset shots are therefore omitted from the real set. The native YouTube chat header remains Japanese; headings and listing copy are English-first, and the public stream/chat are English. No account menu, comment submission, payment, or account preference change was used.

A separate Chrome for Testing window had requested sign-in, but the user chose regular Chrome instead. No capture from the testing window is accepted as real-stream evidence. Public attribution is kept in [source/stream-provenance.md](../../source/stream-provenance.md), and [capture-evidence.json](capture-evidence.json) records the actual installed version and original hashes.

### Earlier production-candidate UI checks

Google Chrome for Testing **156.0.8078.4** ran headed on macOS with a disposable profile. `chrome://extensions` confirmed the extension name, version **2.3.16**, and `.output/chrome-mv3` load path. No testing build or bridge was used.

| Check | Observation |
| --- | --- |
| Live fullscreen | The native live-chat messages and the extension overlay/controls were visible in fullscreen. |
| Settings | The actual Japanese settings panel opened. Keyboard adjustment changed the displayed text-size setting to 26 px. |
| Preference persistence | The 26 px setting remained when moving from an archive to a live watch page. |
| Presets | The bundled preset list opened; applying Dark changed the visible chat appearance. |
| Pointer drag | The live overlay moved from x=20 to x=565, keeping its 400 × 400 size. |
| Pointer resize | The same overlay resized to 537 × 495. |
| Fullscreen reentry | The x=565, y=20, 537 × 495 geometry remained after exiting and entering fullscreen. |
| Archive | Native replay messages were visible on the watch page, and the extension settings opened in fullscreen. Replay progression was not established. |

The profile was signed out. YouTube displayed its sign-in prompt; real comment sending and paid features were not exercised. Video playback returned an error (`readyState: 0`) in this browser session, so successful playback, replay progression, and chat/video synchronization remain unverified on the external site. Real YouTube SPA transitions, no-chat pages, Firefox, and Opera were not part of this capture session.

A separate normal-Chrome verification profile was inspected but had no loaded extension; it is not included as successful runtime evidence. No personal browsing profile was used for these earlier candidate UI checks.

## Production demo capture

[fixtures/capture-evidence.json](../../fixtures/capture-evidence.json) records the loaded production version, browser, manifest/content hashes, checks, and raw-capture hashes. The English-first capture run passed **11 checks, with zero failures, skips, or automatic retries**:

- One extension-manager identity check.
- Ten English checks: fullscreen defaults, keyboard editing of an unsent demo input, preset apply/save, preset undo, rendered/saved text size, pointer drag/resize, fullscreen persistence, reload persistence, compact left placement, and archive chat surface.

The source viewport is **1280 × 720**. The left view was resized to **340 × 400**, and the right view to **400 × 540**, using actual pointer gestures. The chat background was changed to a neutral near-black through the production color control, with saved-state confirmation. The text controls show **17 px** type and **4 px** blur. Settings scroll position and selected Presets paint were settled through actual UI interaction before capture.

The deterministic YouTube DOM, generated photographic rainy-city still, and fictional chat content provide repeatable image inputs. These checks establish that the production extension controls behave on that fixture; they do not verify live delivery, replay progression, payment, or external YouTube compatibility. Earlier capture-harness errors were fixed before the final run; no product workaround or automatic retry was used to obtain the passing result.

## Export review

The real-stream renderer produced three **1280 × 800** screenshots, one **440 × 280** promotional tile, and one **1400 × 560** marquee. [exports/manifest.json](exports/manifest.json) records their dimensions and source/output hashes. Each screenshot displays the native **1600 × 900** capture uniformly at **1280 × 720** under an 80 px English heading. Both promotional images preserve the same complete 16:9 capture. English headings, authentic chat, creator visibility, capture proportions and reduced-size readability were reviewed visually.

The generated evidence omits real watch URLs, video IDs, viewer identities, and chat content. Store publication, version bumps, tags, and release workflows were not performed.

## Repository checks

`yarn verify` passed: locale/listing checks for 55 languages, formatting/types/workflow checks, 799 core/DOM tests with coverage, and 114 contract tests. `yarn test:package` built fresh Chrome/Firefox production packages and passed their output/manifest/ZIP contracts. Script syntax checks and `yarn store:assets:render --check` also passed. Documentation links, all seven original capture hashes/dimensions, all five real export hashes/dimensions, manifest source hashes, and `git diff --check` were verified.
