# Store asset work list

The [Chrome Web Store asset guide](../store-assets/chrome-web-store/README.md) is the current source for draft images, copy, editable layouts and verification evidence. **Three real live-stream captures and five English exports were accepted on 2026-10-14 (JST).** The previous archive set is preserved as history; synthetic captures remain separate under `fixtures/`.

## Dashboard draft saved — 2026-10-16

The selected discovery tile, three global screenshots in **gaming → VTuber → transparent chat** order, and all **55 detailed descriptions** were saved in the Chrome Web Store dashboard using the **daichan** Chrome profile. All descriptions were read back and matched the repository manuscripts. The final save-success message was confirmed; after reloading, the English description and image assignments remained saved. [Draft evidence](../store-assets/chrome-web-store/source/store-draft-20261016.json) and the [complete dashboard snapshot](chrome-dashboard-snapshot-2026-10-16.json) record this state.

**The draft was not submitted for review or published.** No new package was uploaded: both the published and draft package versions remain **2.3.15**. Short descriptions are prepared in the repository but retain the existing package values in the dashboard. The user will handle the package release through GitHub Actions and submit the draft for review.

## Matching marquee draft saved by user — 2026-10-16

A [text-free indigo marquee](../store-assets/chrome-web-store/listing-promo/marquee-indigo-20261016/README.md) was generated to match the selected discovery tile. The **1400 × 560** upload candidate and **700 × 280** preview passed visual checks for fullscreen framing, overlapping chat, composer visibility and bottom-left playback controls. The original, exact prompt and hashes are retained. The user subsequently reported saving the marquee in the store draft. This [follow-up save record](../store-assets/chrome-web-store/source/store-draft-marquee-20261016.json) has not been independently checked in the dashboard; the earlier verified draft evidence is preserved.

## Discovery-tile selection — 2026-10-16

The user selected **06 — インディゴの重なり** on **2026-10-16 (JST)**. The [selected discovery tile](../store-assets/chrome-web-store/listing-promo/selected-20261016/README.md) includes a **440 × 280 upload PNG**, **880 × 560 review PNG**, and a dated selection record with hashes. The attached approval image matches the review export pixel-for-pixel. The artwork remains text-free, with bottom-left playback controls and translucent chat inside fullscreen video. The [ten-concept gallery](../store-assets/chrome-web-store/listing-promo/refined-text-free-imagegen-20261015/index.html) and linked older explorations remain preserved. No store publication has been performed.

## Copy revised on 2026-10-16

All **55 language and region options** now lead with fullscreen viewing and live chat, followed by transparent overlay controls, supported use cases and chat replay. Posting conditions, local settings, external services and compatibility remain explicit. Package titles are **28–66 characters** and short descriptions are **62–131 characters** and synchronized to authored translations and generated manifest messages; English is **128**, Japanese is **73**. [The locale index](../store-assets/chrome-web-store/source/listing-copy-locales.md), [copy sources](../store-assets/chrome-web-store/copy.json) and [editing rationale](../store-assets/chrome-web-store/source/listing-copy-strategy.md) record the prepared text, review scope and official guidance. All manuscripts received a writing pass and a separate review using plain-language and meaning-preservation principles from yomiyasu. This is AI-assisted editorial review, not native-speaker certification. The public store listing has not been updated.

## Prepared on 2026-10-14

- Three English screenshots: **live gaming**, **VTuber community**, and **transparent chat**, exported as `01-live-gaming.png`, `02-vtuber-live.png`, and `03-transparent-chat.png` at **1280 × 800**.
- English **440 × 280** small and **1400 × 560** marquee promotional tiles using the complete gaming capture.
- [Ten Fullscreen + Live Chat discovery-tile directions](../store-assets/chrome-web-store/listing-promo/concepts-fullscreen-live-chat-20261014/README.md), spanning bold typography, VTuber, concert, transparency, retro-game and sports treatments. Both terms appear in every main heading. Each has a **440 × 280** upload candidate, **880 × 560** review copy and **220 × 140** preview, with original artwork, full edit prompts, a numbered comparison, a local gallery and a separate hash manifest. No direction is selected. The first ten concepts and earlier single gaming draft remain as references.
- Untouched **1920 × 1080** native PNG inputs, public source attribution, capture evidence, settings patches, editable composition and source/output hash manifest.
- Genuine visible/editable native composers with an unsent draft, cleared after capture; no message sent.
- A wider panel with **22 px** source text and **3 px** spacing, positioned to preserve gameplay and avatars. Transparency uses **40% background opacity and 4 px blur**.
- Revised English and Japanese detailed descriptions, including English regional variants, and short-description candidates kept separately from package translations.

The set shows the local **2.3.16 production extension**, with its exact enabled unpacked path verified in dedicated normal Chrome. The user manually logged in and explicitly approved temporarily foregrounding only that capture window. Public source links and creator attribution are in [stream provenance](../store-assets/chrome-web-store/source/stream-provenance.md). Creator endorsement or advertising reuse permission is not claimed.

The [variation record](../store-assets/chrome-web-store/source/live-variations.plan.json) selects all three accepted inputs and records **five rendered outputs**. The five exports passed full-size and reduced-size visual review and manifest hash checks. [Store verification](../store-assets/chrome-web-store/verification.md) records the real-site scope; [development verification](../store-assets/chrome-web-store/development-verification.md) retains the earlier unsuccessful routes and offline fixture proof. The preparation-time `yarn verify` passed **963 tests**; the later dashboard draft assignments are recorded above.

## Historical archive draft — 2026-10-13

The earlier PrimeTime archive set is retained in [history/archive-20261013](../store-assets/chrome-web-store/history/archive-20261013/README.md), including three screenshot exports, two promotional exports, original evidence, composition and verification. Its original source captures remain under `inputs/`.

Those images used the published **2.3.15** extension observed in normal Chrome. Appearance and preset screenshots were omitted because the settings panel did not render; the extension-manager page was also unavailable in that profile. Those limitations remain in the historical record and do not describe the current enabled **2.3.16** capture profile. The public Japanese listing inspected on 2026-10-13 showed **2.3.15** and three older screenshots; that observation is not a fresh dashboard/publication check. Localized dashboard assignments were not inspected during this refresh.

## Publication work remaining

1. Confirm the released UI matches the captured **2.3.16 production candidate**; refresh captures if the release changes the visible behavior.
2. Distribute the prepared package titles in `extensionName` and short descriptions in `extensionDescription` through the normal GitHub Actions release workflow. No new version was registered during the draft update.
3. Review the saved dashboard draft before submitting it for review. The selected **06 — インディゴの重なり** tile, three screenshots and all 55 detailed descriptions are already saved. The user reported saving the matching indigo marquee in the draft; that follow-up has not been independently verified. Localized images remain optional future work.
4. After the user submits and the store publishes the update, inspect the public listing and record a fresh publication snapshot.

A promotional video has not been prepared. Review submission, store publication, version bumps, tags and release workflows have not been performed during this draft update.

The [2026-08-19 dashboard snapshot](chrome-dashboard-snapshot-2026-08-19.json), older `screenshots/` captures, and [concept library](../store-assets/concepts/README.md) are historical references. `yarn store:check --snapshot` now compares manuscripts with the [saved 2026-10-16 draft snapshot](chrome-dashboard-snapshot-2026-10-16.json); it does not establish what is currently published.
