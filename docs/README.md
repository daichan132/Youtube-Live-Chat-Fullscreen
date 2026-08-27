# Documentation

Everything written down about YouTube Live Chat Fullscreen, grouped by who it is for.

Documents for users and contributors are written in English. Documents in `maintainers/` are written in Japanese, because they describe the maintainer's own operating procedures rather than the project's public interface.

## If you use the extension

| Document | What it covers |
| --- | --- |
| [Troubleshooting](troubleshooting.md) | The switch does not appear, Opera-specific checks, how to send a sanitized diagnostic report |
| [README (日本語)](translations/README.ja.md) · [README (繁體中文)](translations/README.zh-TW.md) | Translations of the product README |

Bug reports go through the [bug report form](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml). Security issues go through [SECURITY.md](../SECURITY.md), never a public issue.

## If you are contributing code

Read in this order.

| Document | What it covers |
| --- | --- |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Setup, the checks that must pass, translation and screenshot procedures |
| [Engineering overview](engineering.md) | Why the system is shaped this way, the vocabulary, one reconcile pass end to end, and a "where do I change X" map |
| [Test contracts](testing/contracts.md) | Which test layer proves which boundary, every test command, and what CI owns |

Then the subsystem you are about to change:

| Document | What it covers |
| --- | --- |
| [The content runtime](architecture/content-runtime.md) | Lazy bootstrap, session generations, the YouTube adapter, the pure decision model, and the four leases that mutate the page |
| [Settings, state, and storage](architecture/settings-and-state.md) | The stored envelopes, cross-context synchronization, migration, and chat geometry |
| [The overlay and iframe styling](architecture/overlay-and-styling.md) | Shadow roots and portals, drag and resize, and how a style setting becomes CSS inside YouTube's chat iframe |
| [Internationalization](architecture/i18n.md) | The 55-locale generation pipeline, adding a key, adding a language, and RTL |

Two module-level documents stay next to the code they describe:

- [`entrypoints/content/features/YTDLiveChatIframe/styles/README.md`](../entrypoints/content/features/YTDLiveChatIframe/styles/README.md) — the CSS cascade contract for the styles injected into YouTube's chat iframe. Authoritative for those modules; read it before touching any file in that directory.
- [`docs/store-assets/concepts/README.md`](store-assets/concepts/README.md) — the store image concept catalog.

## If you maintain the project

These are in Japanese. See [`maintainers/README.md`](maintainers/README.md) for the index.

| Document | What it covers |
| --- | --- |
| [リリース Runbook](maintainers/release-runbook.md) | Cutting a release candidate, promoting it to the stores, and what to do when the canary is degraded |
| [実ブラウザ検証](maintainers/verification-browser.md) | Driving a real Chrome, Opera, or Firefox against YouTube to produce the evidence the release workflow requires |
| [リポジトリの見せ方](maintainers/repository-presentation.md) | GitHub repository settings that mirror the product positioning |

Store listing copy lives in [`store-listing/`](store-listing/) — 55 locale manuscripts validated by `yarn store:check`, which runs inside `yarn check`. See [`store-listing/asset-work-list.md`](store-listing/asset-work-list.md) for the asset backlog.

## Not documentation

[`articles/`](../articles/) holds unpublished drafts for external platforms, not project documentation. See [`articles/README.md`](../articles/README.md).

## Keeping this accurate

Most of what this project enforces is enforced by scripts, not by prose. When a document and the code disagree, the code wins — and the document is a bug. The checks that back these documents:

| Check | Runs in | Enforces |
| --- | --- | --- |
| `scripts/verify/check-runtime-architecture.mjs` | `yarn check` | The runtime ownership rules described in [architecture/content-runtime.md](architecture/content-runtime.md) |
| `scripts/verify/check-package-contracts.mjs` | `yarn test:package`, CI | Manifest permissions, locale inventory, and what may appear in a release ZIP |
| `scripts/verify/check-locales.mjs` | `yarn check` | That generated locale artifacts match their sources |
| `scripts/verify/check-store-listing.mjs` | `yarn check` | The 55 store listing manuscripts |
| `scripts/verify/check-release-workflow.mjs` | `yarn check` | That the release workflows still have the shape [maintainers/release-runbook.md](maintainers/release-runbook.md) describes |

There is no check that verifies these documents themselves. If you change behavior that a document describes, change the document in the same pull request.
