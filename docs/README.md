# Documentation

Start with what you want to do. The [project README](../README.md) introduces the extension and links to the browser stores; this page helps you use it, understand the code, or make a change.

Product and contributor documents are in English. The [Japanese](translations/README.ja.md) and [Traditional Chinese](translations/README.zh-TW.md) READMEs introduce the product in those languages. Maintainer operating procedures are in Japanese.

## Use the extension

| I want to… | Start here |
| --- | --- |
| Move chat, choose a style, save presets, or back up settings | [User guide](user-guide.md) |
| Fix a missing panel or collect a diagnostic report | [Troubleshooting](troubleshooting.md) |
| Report a reproducible problem | [Bug report form](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml) |
| Suggest a feature | [Feature request form](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=feature.yml) |

Security vulnerabilities should be reported privately using [SECURITY.md](../SECURITY.md).

## Make your first change

The [contribution guide](../CONTRIBUTING.md) covers local setup and how to verify a change. The [engineering overview](engineering.md) explains the three extension entrypoints and the ownership boundaries that keep YouTube page changes manageable.

Choose the document closest to the area you are changing:

| Area | Read | Code entry point |
| --- | --- | --- |
| YouTube routes, sessions, chat sources, cleanup | [Content runtime](architecture/content-runtime.md) | [Content entrypoint](../entrypoints/content/index.tsx) |
| Stored preferences, presets, import/export | [Settings and state](architecture/settings-and-state.md) | [Settings repository](../shared/settings/) |
| Panel interactions and chat styling | [Overlay and iframe styling](architecture/overlay-and-styling.md) | [Content features](../entrypoints/content/features/) |
| Translation and right-to-left layouts | [Internationalization](architecture/i18n.md) | [Translation sources](../shared/i18n/assets/) |
| Tests, production packages, CI gates | [Testing contracts](testing/contracts.md) | [Browser scenarios](../e2e/scenarios/) |

The [iframe CSS guide](../entrypoints/content/features/YTDLiveChatIframe/styles/README.md) lives next to the styles it describes. Repository-managed [triage](../.agents/skills/triage-ylc-user-report/SKILL.md) and [verification](../.agents/skills/verify-ylc-change/SKILL.md) skills support recurring investigation and development work.

## Maintain and release

The [maintainer guide](maintainers/README.md) connects the operating procedures:

- [Release runbook](maintainers/release-runbook.md): prepare a candidate and promote its verified artifacts.
- [Real-browser verification](maintainers/verification-browser.md): gather Chrome, Opera, and Firefox evidence on YouTube.
- [Runtime diagnostics](maintainers/runtime-failure-diagnostics.md): investigate unexpected runtime failures.
- [Repository presentation](maintainers/repository-presentation.md): keep GitHub discovery and preview assets aligned with the product.

Store listing manuscripts are in [store-listing/](store-listing/); `yarn store:check` checks their required content. The [Chrome Web Store asset guide](store-assets/chrome-web-store/README.md) includes the English screenshot set, promotional tiles, editable sources, and capture evidence. The [asset work list](store-listing/asset-work-list.md) tracks publication status; older [image concepts](store-assets/concepts/README.md) remain design references. The drafts in [articles/](../articles/README.md) are intended for external publication, rather than setup or support instructions.

## Keep the docs useful

Update the relevant document when behavior changes. Keep setup and verification commands aligned with `package.json`, and keep detailed contracts in their subsystem documents so the README remains an introduction.

For documentation-only edits, check links, images, commands, and the diff. Code and configuration changes use `yarn verify` plus the additional gates in [testing contracts](testing/contracts.md). Code and executable contracts are authoritative when prose disagrees.
