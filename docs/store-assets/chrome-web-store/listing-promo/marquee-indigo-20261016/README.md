# Indigo fullscreen chat marquee

A text-free marquee illustration matching the selected [Indigo overlay discovery tile](../selected-20261016/README.md), generated with the built-in GPT Image tool on **2026-10-16 (JST)**.

![Indigo fullscreen video with an overlapping live-chat panel](marquee.png)

- **Store asset:** [marquee.png](marquee.png), **1400 × 560**, opaque RGB PNG.
- **Half-size preview:** [marquee-half.png](marquee-half.png), **700 × 280**.
- **Generated original:** [original.png](original.png), **1983 × 793**.
- **Exact generation prompt:** [prompt.md](prompt.md).
- **Provenance, dimensions and hashes:** [metadata.json](metadata.json).

The original was generated as a new wide composition using the approved small tile as a visual reference. The upload and half-size copies were downsampled by width with macOS `sips`; output heights use integer rounding. No crop, repainting, typography or upscaling was added after generation. The original is preserved byte-for-byte.

Four corner brackets indicate fullscreen viewing. Five abstract chat rows and a composer overlap the blue video artwork; playback controls remain at bottom left and clear of the chat. Full-size and half-size visual checks found no clipping or overlap. This is a promotional illustration, separate from the real-stream screenshots.

The dimensions follow the [Chrome Web Store promotional-image guidelines](https://developer.chrome.com/docs/webstore/images#promotional-images). The user reported saving this image in the store draft on **2026-10-16**. The [follow-up record](../../source/store-draft-marquee-20261016.json) marks that save as user-reported and not independently checked in the dashboard. The [earlier verified draft record](../../source/store-draft-20261016.json) remains historical evidence. Codex did not submit the draft for review or publish it. The selected small tile and older capture-based marquee are preserved.

To reproduce the exports from this directory:

```bash
sips --resampleWidth 1400 original.png --out marquee.png
sips --resampleWidth 700 marquee.png --out marquee-half.png
```
