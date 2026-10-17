# Documentation

The [project README](../README.md) introduces the extension and links to the browser stores. Choose a guide below for using it or contributing.

Product introductions, user guides, and troubleshooting are available in English, Japanese, and Traditional Chinese. Documentation translations are separate from the extension's interface languages. Contributor and architecture guides are in English; maintainer procedures are mainly in Japanese.

## Use the extension

- English: [Introduction](../README.md) · [User guide](user-guide.md) · [Troubleshooting](troubleshooting.md)
- 日本語: [紹介](translations/README.ja.md) · [使い方](translations/user-guide.ja.md) · [トラブル対処](translations/troubleshooting.ja.md)
- 繁體中文: [專案介紹](translations/README.zh-TW.md) · [使用指南](translations/user-guide.zh-TW.md) · [疑難排解](translations/troubleshooting.zh-TW.md)

The user guide covers panel placement, appearance, presets, and backups. Troubleshooting helps with missing or empty chat and useful bug reports. For private vulnerability reports, follow the [security policy](../SECURITY.md) in English.

## Contribute

Start with [Contributing](../CONTRIBUTING.md) for setup and verification, then read the [engineering overview](engineering.md) for a code map.

| Area | Guide |
| --- | --- |
| YouTube navigation, sessions, chat sources, and cleanup | [Content runtime](architecture/content-runtime.md) |
| Stored preferences, presets, and backups | [Settings and state](architecture/settings-and-state.md) |
| Panel interactions and chat appearance | [Overlay and iframe styling](architecture/overlay-and-styling.md) |
| Translations and right-to-left layouts | [Internationalization](architecture/i18n.md) |
| Tests, production packages, and CI | [Testing contracts](testing/contracts.md) |

The [iframe CSS guide](../entrypoints/content/features/YTDLiveChatIframe/styles/README.md) documents individual stylesheet responsibilities next to the code.

## Maintain and publish

The [maintainer guide](maintainers/README.md) covers releases, real-browser verification, and store updates. These procedures are intended for people maintaining the repository.

- [Store publication checklist](store-listing/asset-work-list.md): update listing text and images, then verify publication.
- [Chrome Web Store assets](store-assets/chrome-web-store/README.md): prepared images, editable sources, and capture evidence.
- [Store descriptions](store-listing/): manuscripts for each supported locale, checked by `yarn store:check`.

The asset guide contains only the selected store set and its supporting sources. Selection and prepared files do not establish what is currently published. Unpublished articles in [`articles/`](../articles/README.md) are separate from the maintained product and development guides.

## Update documentation

Update the relevant guide when behavior changes. Keep setup instructions in Contributing, subsystem details in the architecture guides, and verification requirements in Testing contracts. Link to those explanations rather than repeating them.

### Maintain translated guides

The English [README](../README.md), [user guide](user-guide.md), and [troubleshooting guide](troubleshooting.md) are the reference texts for their translations in [`translations/`](translations/).

- Update the existing Japanese and Traditional Chinese versions in the same change as the English text. Preserve capabilities, limitations, step order, and the difference between live chat and replay.
- Match control names to the actual strings in [`shared/i18n/assets/`](../shared/i18n/assets/). If a control still displays English in that locale, keep its displayed name and explain it in the surrounding text.
- Link to the same topic in the reader's language. Mark links to untranslated guides with their language, and keep the language switcher on the equivalent page.
- Reuse the selected screenshots and their source credits. Keep images in the shared [asset directory](store-assets/chrome-web-store/README.md), rather than making a copy for each language.
- When adding a documentation language, list the available guides above and update their language links. Label any English fallback for topics that are not yet translated. Review each translation against the reference text and localized UI; locale-generation checks do not assess documentation translations.

Documentation Markdown is not generated from interface strings. Adding or editing a guide does not require regenerating locale bundles. Interface translations follow the [internationalization guide](architecture/i18n.md).

For documentation-only changes, check local links, images, commands, and the diff. Code, configuration, and dependency changes also require `yarn verify` and the additional checks described in [Testing contracts](testing/contracts.md). When prose disagrees with the implementation, check the code and executable checks before updating it.
