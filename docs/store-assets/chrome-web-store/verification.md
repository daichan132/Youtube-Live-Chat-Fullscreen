# Store asset verification — 2026-10-14

**Three genuine live-stream captures and five English exports were accepted on 2026-10-14 (JST).** They show the local **2.3.16 production extension** in dedicated regular Chrome. Product runtime source was unchanged for this asset refresh. The public store listing has not been updated.

## Browser and extension identity

The user completed manual login in an ignored, persistent, dedicated **Google Chrome 155.0.8059.40** profile, without an automation/debugging connection during login. The same profile was retained for capture; no cookies or profile files were copied. The extension manager verified the exact enabled `.output/chrome-mv3` unpacked path, version **2.3.16**, ID `ddnjecbcjffkldooafklphikkbmgmaol`. The injected production content host and native chat styling were also observed. Normal Chrome preserved its native User-Agent.

The user explicitly approved temporarily foregrounding only this dedicated capture Chrome. The earlier no-foreground capture failures are historical attempts, recorded in [development verification](development-verification.md); they no longer block the selected set.

## Accepted real YouTube captures

| Input | Decoded video source | Overlay placement | Background |
| --- | --- | --- | --- |
| `inputs/en/live-gaming.png` | 2560 × 1440, highest available 1440p60 | Upper right | 94% opacity, no blur |
| `inputs/en/vtuber-live.png` | 1920 × 1080 | Upper left, avatars visible | 94% opacity, no blur |
| `inputs/en/transparent-live.png` | 2560 × 1440 | Upper right | 40% opacity, 4 px blur |

All three are untouched native **1920 × 1080 PNGs**, captured with complete 16:9 video. Native YouTube fullscreen, populated chat, playing video, progressing video position and absence of a player advertisement were checked. Each accepted image used one capture attempt. Public source links and creator attribution remain in [stream provenance](source/stream-provenance.md).

The native composer was visible, editable and positively hit-tested without obstruction. An unsent draft was displayed through the actual contenteditable input for each image and cleared after capture. No message was sent, and no input or chat UI was painted over the screenshot. Native YouTube UI was temporarily English during capture.

After capture, native video quality was restored to **Auto** on both sources, YouTube UI was restored to **Japanese**, and drafts were blank. The exact owned Chrome was closed; the dedicated authenticated profile was retained.

All three use **22 px** source text and **3 px** message spacing. The panel occupies **30%** of video width and **52%** of video height, at y=5.5%; x=64.5% for the right panel and x=2% for the left panel. The transparent image visibly shows blurred video through the real 40% background. The old offline 22% alpha fixture is separate proof, not the selected transparency appearance.

## Window and capture geometry

The native Chrome window reported `windowState: fullscreen`, width **1920**, top **88** and height **992**. The page capture viewport and clip were separately fixed at **1920 × 1080** after native YouTube fullscreen, on the same CDP session that acquired the PNG, and cleared afterward. These are distinct measurements; the page capture size is not a claim that the physical window frame was 1920 × 1080.

[capture-evidence.json](capture-evidence.json) retains browser/extension identity, native-window bounds, capture viewport/clip, settings, verification flags and original SHA-256 hashes. Source pixels were not normalized, stretched, repainted or reconstructed. Diagnostic evidence excludes watch URLs, video IDs, viewer identities, chat text and account data.

## Export and repository checks

The renderer produced three **1280 × 800** screenshots, one **440 × 280** small promotional tile and one **1400 × 560** marquee, with no missing inputs, invalid dimensions or optional panels. Each screenshot uniformly displays the complete source at **1280 × 720**, beneath an 80 px English heading. Both promotional tiles preserve the complete gaming capture. [exports/manifest.json](exports/manifest.json) records source/output hashes, dimensions and fonts; [composition.json](source/composition.json) selects the current three PNGs.

All five output hashes matched the manifest. Visual review covered full size, screenshots at **640 × 400**, the small tile at **220 × 140**, and the marquee at **700 × 280**. There was no material clipping or overlap. Headings remained readable, native composers and send icons were clear, avatars remained visible, and transparency contrast was acceptable. Secondary captions and chat text are not readable at the smallest promotional preview sizes; this review does not claim otherwise.

`yarn verify` exited successfully with **963 tests across 148 files**: **799 core/DOM tests in 134 files** and **164 contract tests in 14 files**, plus locale/listing checks for **55 languages**, formatting, types and repository checks. The current executable changes are covered.

The offline production **2.3.16** background-capture fixture separately proved exact **1600 × 900** fullscreen capture, editable native fixture composer, **0.22 alpha** blend pixels and focus restoration, with **zero skips or test retries**. Capture contracts also reject a native contenteditable composer covered by a modal and accept it after the obstruction is removed. Fixture success is not external YouTube compatibility evidence.

Message submission, paid features, real-site SPA/no-chat transitions, replay synchronization, Firefox and Opera were not exercised in the accepted live-capture session. Store publication, version bumps, tags and release workflows were not performed.

## Historical archive and earlier attempts

The reviewed **2026-10-13 PrimeTime archive set** remains intact in [history/archive-20261013](history/archive-20261013/README.md), with its original [verification record](history/archive-20261013/verification.md), evidence, composition and five exports. Those images used the published **2.3.15** extension and a **1600 × 900 JPEG** capture. The settings iframe and extension-manager page were blank in that profile; appearance and preset images were omitted. Its earlier production-candidate and package checks retain their original scope and counts.

The generated rainy-street production demo and fictional fixture chat remain under [fixtures/capture-evidence.json](fixtures/capture-evidence.json). Neither fixture images nor the superseded archive images are selected by the current composition.
