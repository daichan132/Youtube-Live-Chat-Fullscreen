# Capture real stream screenshots

**Current set: three genuine 1920 × 1080 live-stream PNGs and five reviewed exports, accepted on 2026-10-14 (JST).** The enabled unpacked production extension is **2.3.16**, in a dedicated regular-Chrome profile. This workflow refreshes the selected live-gaming, VTuber and transparent-chat examples; public source links and creator credit belong in [stream provenance](stream-provenance.md).

1. **Confirm the owned browser and extension.** Use a separate dedicated profile, match its process and debugging port, and verify the exact enabled unpacked path/version in `chrome://extensions`. Also confirm the injected production content host and actual chat styling. For first-time login, open ordinary Chrome without automation/CDP and let the user sign in, then retain that same profile for the verification restart. Follow the [maintainer procedure](../../../maintainers/verification-browser.md#ログイン済み-ui-の検証); do not copy cookies or private profiles.
2. **Recheck the public source.** Require playing decoded video, progressing position, populated native live chat and a visible/editable composer. Check native input hit-testing so a modal-covered composer is rejected. Clear player advertisements before capture. A source that has ended or only offers replay is not eligible for these live-composer images. Keep the creator and main action visible.
3. **Enter native fullscreen and record both surfaces.** Establish the viewing area, use YouTube's real fullscreen button and verify the actual overlay. The current session used the user's explicit approval to temporarily foreground only the dedicated capture Chrome; inactive headed fullscreen had previously failed. Exact page capture dimensions and native-window bounds are separate evidence. The accepted window reported fullscreen width 1920, top 88 and height 992; the page viewport and clip were **1920 × 1080**.
4. **Apply and read back real settings.** Use [live-gaming.json](settings/live-gaming.json), [vtuber-live.json](settings/vtuber-live.json), or [transparent-live.json](settings/transparent-live.json) through `verify:settings`. They keep full-chat mode, pinned placement and always-visible display, with **22 px** white text and **3 px** spacing. The panel is **30%** wide and **52%** high at y=5.5%, right x=64.5% or left x=2%. The left VTuber panel leaves the avatars visible. Transparency uses **40% opacity with 4 px blur**. Settings readback alone is insufficient: confirm the native painted result, including video showing through the transparent background.
5. **Show the actual composer.** Retain the real input and send icon. For the accepted set, an unsent draft was displayed through the native contenteditable input and cleared after each capture; no message was sent. Never replace a missing input with painted controls, fictional chat or fixture UI. Avoid account menus, authentication screens and credentials.
6. **Capture the complete video natively.** Use the launch output's exact target ID. The capture helper applies the requested **1920 × 1080** viewport after native fullscreen on the same CDP session as the screenshot, checks the resulting surface and clip, then clears the metrics. Startup viewport alone does not guarantee those dimensions survive fullscreen. Save untouched native PNGs as `inputs/en/live-gaming.png`, `vtuber-live.png`, and `transparent-live.png`; do not normalize, stretch, repaint or reframe them afterward.
7. **Record evidence, render and review.** Record SHA-256 hashes, date, identity, native-window bounds, page viewport/video/clip dimensions, settings, checked behavior and limitations in `capture-evidence.json`. Run the renderer check and export, inspect full and reduced sizes, and retain inputs with the editable composition and manifest. Keep old accepted sets in a dated history directory before selecting their replacements.

The exact-target capture command is:

```bash
yarn verify:screenshots --background --video-only --require-composer --viewport 1920x1080 \
  --port 9336 --profile "$ylc_profile" --target-id <target_id> \
  --out /private/tmp/ylc-live-store-capture
```

`ylc_profile` is the same dedicated profile used by the [maintainer login/launch procedure](../../../maintainers/verification-browser.md#ログイン済み-ui-の検証). `--background` captures the target's page surface and does not guarantee native fullscreen in an inactive headed window. The accepted headed route used the separately authorized dedicated-window foreground action. Native-identity headless real-site capture did not pass in this session; stop that route if login or composer prerequisites fail.

The store screenshot canvas is **1280 × 800**: an 80 px English heading above the complete video uniformly displayed at **1280 × 720**. Promotional tiles also preserve complete 16:9 capture proportions. Native YouTube UI was temporarily English for the current session; keep any temporary UI/quality changes scoped to the capture profile and restore them afterward.

Review screenshots at full size and **640 × 400**, the small promo at **220 × 140**, and the marquee at **700 × 280**. Check headings, genuine composer/send icon, creator visibility, framing and transparency contrast. Small secondary copy and native chat are not expected to be readable at promotional thumbnail sizes.

## History and fixture boundaries

The earlier **2026-10-13 PrimeTime archive set** used the published **2.3.15** extension and native **1600 × 900 JPEGs**. Its original captures remain under `inputs/`, and its evidence, composition, verification and five exports are preserved in [history/archive-20261013](../history/archive-20261013/README.md). Its blank settings panel and unavailable manager verification remain historical limitations.

The fixture script writes only to `fixtures/`. Offline production capture proves an exact **1600 × 900** surface, fixture composer, **22% alpha** blend and focus restoration; it cannot establish external playback, authentication or creator permissions. Fixture images never replace genuine inputs. Earlier no-foreground and headless real-site failures remain in [development verification](../development-verification.md).

Keep public links and creator attribution in [stream-provenance.md](stream-provenance.md). Diagnostic evidence excludes URLs, video IDs, chat text, usernames and account data. This guide records a capture workflow; it does not grant a license to source media or establish checks before they occur. Store publication has not been performed.
