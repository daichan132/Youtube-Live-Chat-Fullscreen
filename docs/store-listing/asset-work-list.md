# Store asset work list

Use this checklist when updating store descriptions or images. The [Chrome Web Store asset guide](../store-assets/chrome-web-store/README.md) links to prepared images, editable sources, and capture evidence. Saved drafts and dated records describe a past observation; check the dashboard and public listing before deciding what remains to publish.

## Prepare the text and images

1. Edit the [locale manuscripts](./) for detailed descriptions. Package titles and short descriptions come from `shared/i18n/assets/*.json`; regenerate locale output after changing them. See [Internationalization](../architecture/i18n.md).
2. Run `yarn store:check` to check required content, lengths, links, and locale coverage. `yarn store:check --snapshot` also compares manuscripts with the saved dashboard snapshot; it does not check the live store.
3. Choose screenshots and promotional tiles from the asset guide. Keep the source, prompt where applicable, creator attribution, capture settings, and source/output hashes with the images. Candidates remain separate from selected exports.
4. Review each image at full size and at the reduced sizes in the asset guide. Check that the visible interface matches the package being released and that private account information is removed. Refresh captures when visible behavior changes.

The [copy locale index](../store-assets/chrome-web-store/source/listing-copy-locales.md) and [copy strategy](../store-assets/chrome-web-store/source/listing-copy-strategy.md) explain the prepared text and its review scope. Editorial checks do not establish native-speaker quality.

## Update the store

1. Release package titles and short descriptions through the [release procedure](../maintainers/release-runbook.md). The release workflows submit extension packages, not detailed listing text or images.
2. Update detailed descriptions and image assignments in the store dashboard. Review all affected locale assignments, save, reload, and check the saved values.
3. Submit the intended draft for review, then check the public listing after publication. Record what was verified and when; a saved draft or accepted submission does not establish publication.

## Selected assets

The [asset guide](../store-assets/chrome-web-store/README.md) lists the four screenshots and two promotional images confirmed by the user on 2026-10-18 (JST). Its manifest records their hashes and source attribution. README examples use the same privacy-protected screenshot files.

Older concepts, captures, comparison galleries, and unselected exports have been removed. Keep only selected designs and the source files needed to maintain them. The selection does not establish a store upload or publication; check the dashboard and public listing separately.
