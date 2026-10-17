# Chrome Web Store assets

The user selected these six images on 2026-10-18 (JST). Their bytes are unchanged from the approved files. [manifest.json](manifest.json) records each output, its SHA-256, its previous location, and the retained sources. This cleanup did not upload images, submit a review, or publish the store listing.

## Selected images

Upload the four screenshots in filename order.

1. [Introduction](screenshots/01-introduction.png): shared illustration, 1280 × 800.
2. [Default chat](screenshots/02-default-chat.png): Kazama Iroha, native message input with an unsent draft, 1280 × 800.
3. [Transparent chat](screenshots/03-transparent-chat.png): CohhCarnage, fully transparent messages-only layout, 1280 × 800.
4. [Custom style](screenshots/04-custom-style.png): DrLupo, navy chat background and Inter font, 1280 × 800.

The promotional images are [small-promo.png](promotional/small-promo.png), 440 × 280, and [marquee.png](promotional/marquee.png), 1400 × 560. Both use the selected indigo illustration.

Each real-stream screenshot displays its complete 1920 × 1080 source at 1280 × 720 below an 80 px heading. The introduction and promotional images are illustrations. The real examples use the extension's actual chat UI.

## Sources and privacy

- [Kazama Iroha / hololive](https://www.youtube.com/watch?v=voiuRX0Fs3Y): live capture on 2026-10-17, default profile. The native input contains an unsent `Hello!` draft; no message was submitted.
- [CohhCarnage](https://www.youtube.com/watch?v=28chbgbw-dA): archive example from *Valor Mortis | October 16th*, captured on 2026-10-17 with a fully transparent, messages-only layout.
- [DrLupo](https://www.youtube.com/watch?v=liUtg0I2ZVE): archive example captured on 2026-10-17 with a navy background, Inter font, and messages-only layout.

Viewer names, avatars, donor information, and mentions are blurred in the prepared images or hidden through actual product settings. Ordinary message bodies and creator faces remain visible. This image processing is separate from the extension's background blur setting. The examples do not imply creator use or endorsement, and the archive examples do not demonstrate live-message posting.

[Capture provenance](source/capture-provenance.json) retains source URLs, capture dates, quality selection, settings, and processed-image hashes. Only the three privacy-processed native sources remain in [source/captures/](source/captures/). Unredacted originals and unused candidates are excluded from this asset set.

## Sources and previews

The selected [indigo original](source/indigo-original.png) and its [generation prompts](source/indigo-prompt.json) support the introduction and small tile. The [marquee original](source/marquee-original.png) and [prompt](source/marquee-prompt.md) retain the wide composition. [introduction.html](source/introduction.html) uses the extension icon and bundled Inter font under its [SIL Open Font License](source/fonts/LICENSE).

From the repository root, use Node.js 24 and the pinned Yarn.

```bash
yarn store:assets:render --check
yarn store:assets:render
```

The first command checks selected output and source hashes, dimensions, and PNG format. The second renders comparison previews in a temporary directory and reports whether they match the selected bytes. It preserves the approved files. A preview can differ when the rendering tool differs from the original export, as with the marquee's historical `sips` downsampling.

The reusable [transparent settings example](source/settings/transparent-live.json) supports the [browser verification guide](../../maintainers/verification-browser.md). The three selected capture settings are kept beside it.

## Listing copy

[copy.json](copy.json) points to store descriptions and package metadata sources. The [locale inventory](source/listing-copy-locales.md), [package titles and summaries](source/package-metadata.md), and [copy rationale](source/listing-copy-strategy.md) document the prepared text. Run `yarn store:check` after editing listing copy, and follow the [store publication checklist](../../store-listing/asset-work-list.md) for dashboard work.
