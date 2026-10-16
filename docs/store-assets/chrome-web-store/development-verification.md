# Development settings and capture verification

Updated on **2026-10-14, macOS**. The selected store set now has **three accepted real live-stream PNGs and five reviewed exports**. This record separates development-tool proof, accepted real-site captures and earlier unsuccessful attempts. The old archive set remains in [history/archive-20261013](history/archive-20261013/README.md).

## Current verification — 2026-10-14

Manual login completed in an ignored, persistent, dedicated **regular Google Chrome 155.0.8059.40** profile, opened without automation or a debugging connection during login. The same profile was retained and restarted for verification; no cookies or profile contents were copied. The extension manager verified the exact enabled `.output/chrome-mv3` unpacked path, extension **2.3.16**, ID `ddnjecbcjffkldooafklphikkbmgmaol`. Normal Chrome headed/headless preserves its native User-Agent.

- `yarn verify`: **963 tests passed** across **148 files**: **799 core/DOM tests in 134 files**, **164 contract tests in 14 files**, plus locale/listing checks for **55 languages**, formatting, types and repository checks. The final run exited successfully and covers the current executable changes.
- Offline production **2.3.16** background capture: exact **1600 × 900** native fullscreen PNG, visible/editable native fixture composer, alpha **0.22** blend pixels, decoded source pixels, unavailable-composer rejection and restored sentinel-tab/focus state passed with **zero skips and zero test retries**. Exact viewport metrics were applied after native fullscreen on the **same capture CDP session** and cleared afterward. No fixture pixels were selected as real store imagery.
- The **15 capture contracts** include a native contenteditable composer behind a modal: the covered input is rejected by pure hit-testing, and the unobstructed input is accepted. This avoids treating an editable but unreachable input as usable.
- Real YouTube: the user explicitly approved temporarily foregrounding only the dedicated capture window. All three selected native **1920 × 1080** PNGs passed fullscreen, populated live chat, visible/editable/unobstructed composer, unsent draft, playing/progressing video and no-ad checks. Each accepted image used one capture attempt. Drafts were cleared after capture; no message was sent.
- The renderer generated all **five** current exports with valid dimensions and no missing inputs. Output hashes matched the manifest. Full-size and reduced-size visual review passed for headings, native composers, creator visibility, clipping and transparent-background contrast.

Settings patches for [live gaming](source/settings/live-gaming.json), [VTuber live](source/settings/vtuber-live.json), and [transparent chat](source/settings/transparent-live.json) match the accepted images: **22 px** text, **3 px** spacing, **30% × 52%** panel, y=5.5%, right x=64.5% or left x=2%. The final real transparency image uses **40% opacity and 4 px blur**; the offline fixture's 22% alpha is separate evidence.

The native fullscreen window reported width **1920**, top **88** and height **992**. The capture viewport and clip were independently **1920 × 1080**, retained on the same capture session. Do not describe the capture surface as the physical window frame. [Store verification](verification.md) and [capture evidence](capture-evidence.json) retain the accepted-image details.

After capture, native video quality was restored to **Auto** on both sources, YouTube UI was restored to **Japanese**, and drafts were blank. The exact owned Chrome was closed; the dedicated authenticated profile was retained.

The offline fixture does not prove external YouTube playback or authentication compatibility. The real session did not exercise message submission, paid features, real-site SPA/no-chat transitions, replay synchronization, Firefox or Opera. Public source links and creator attribution remain in [stream provenance](source/stream-provenance.md); diagnostic records exclude watch URLs, video IDs, viewer names, message text and account data.

## Earlier capture attempts — 2026-10-14

Before the user changed the foreground constraint, both attempted routes respecting **no foregrounding** failed:

- Inactive headed Chrome timed out entering native fullscreen.
- Native-identity headless Chrome had no usable native composer after **60 seconds**, with ads cleared and the video source visible. No image from that attempt was accepted.

Automatic approval review rejected targeted foregrounding under the then-current user constraint. That action **was not executed then**. The user later explicitly approved temporarily foregrounding only the dedicated capture Chrome, enabling the accepted headed route above. This does not establish successful headless real-site capture or an inactive-window fullscreen guarantee.

An earlier readiness check found populated chat and an editable live composer on a different VTuber source. A fresh preflight showed that broadcast had ended and no longer had a live composer. It was excluded; the currently selected VTuber source was rechecked at capture time. These observations are retained in provenance.

## Historical observations — 2026-10-13

The earlier developer capture used **Chrome for Testing 156.0.8078.4**, extension **2.3.16**, and the exact `.output/chrome-mv3` unpacked path. Its production content-script SHA-256 was `5efe317b69eba09c141fbe2505dd9926a08de3c7dff74897f6da34d6b62dddaa`.

- The then-current `yarn verify` run passed **957 tests** (799 core/DOM, 158 contracts).
- The earlier offline background scenario checked settings readback, alpha **0.22**, native fixture composer, fullscreen, decoded video and blend pixels, unavailable-composer rejection and restored tab/focus state. Its native clip was **1124 × 633**, with no skips or test retries; it was not resized into a store asset. The current fixture proves the exact dimensions recorded above.
- Real YouTube in a signed-out headless Chrome for Testing profile accepted startup/later settings, an exact-target fullscreen background capture and transparent overlay. A composer-required run rejected the login prompt and saved no candidate screenshot. No message was entered or sent.
- An earlier normal-Chrome headless startup rejected a dedicated profile with no requested unpacked extension installed, and the newly started process was closed. That historical failure does not describe the now-authenticated profile with verified **2.3.16** installed.

See the [maintainer procedure](../../maintainers/verification-browser.md#設定ファイルを使った起動と撮影) and [current variation record](source/live-variations.plan.json). Store publication was not performed.
