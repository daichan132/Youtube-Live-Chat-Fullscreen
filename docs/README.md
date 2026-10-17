# Documentation

The [project README](../README.md) introduces the extension and links to the browser stores. Choose a guide below for using it or contributing.

Product and contributor guides are in English. Product introductions are also available in [Japanese](translations/README.ja.md) and [Traditional Chinese](translations/README.zh-TW.md). Maintainer procedures are mainly in Japanese.

## Use the extension

- [User guide](user-guide.md): move and style the panel, save presets, and back up settings.
- [Troubleshooting](troubleshooting.md): check missing or empty chat and report a problem.
- [Security policy](../SECURITY.md): report a vulnerability privately.

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

Asset concepts and dated capture records are reference material, not evidence of the current store listing. Unpublished articles in [`articles/`](../articles/README.md) are separate from the maintained product and development guides.

## Update documentation

Update the relevant guide when behavior changes. Keep setup instructions in Contributing, subsystem details in the architecture guides, and verification requirements in Testing contracts. Link to those explanations rather than repeating them.

For documentation-only changes, check local links, images, commands, and the diff. Code, configuration, and dependency changes also require `yarn verify` and the additional checks described in [Testing contracts](testing/contracts.md). When prose disagrees with the implementation, check the code and executable checks before updating it.
