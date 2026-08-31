# Documentation

Everything written down about YouTube Live Chat Fullscreen, grouped by audience.

Public product and contributor documents are in English. Maintainer operating procedures under `maintainers/` are in Japanese.

## Extension users

| Document | What it covers |
| --- | --- |
| [Troubleshooting](troubleshooting.md) | Missing switch, browser-specific checks, and sanitized diagnostics |
| [README (日本語)](translations/README.ja.md) · [README (繁體中文)](translations/README.zh-TW.md) | Product README translations |

Use the repository bug form for ordinary defects and [SECURITY.md](../SECURITY.md) for security reports.

## Contributors

Read these first:

| Document | What it covers |
| --- | --- |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Setup and contribution workflow |
| [Engineering overview](engineering.md) | System shape, vocabulary, guarantees, and verification |
| [Test contracts](testing/contracts.md) | Test placement, commands, package boundaries, and CI ownership |

Then read the subsystem document relevant to the change:

| Document | What it covers |
| --- | --- |
| [Content runtime](architecture/content-runtime.md) | Supported routes, session generations, YouTube observation, decisions, and leases |
| [Settings, state, and storage](architecture/settings-and-state.md) | Stored envelopes, synchronization, migration, presets, and geometry |
| [Overlay and iframe styling](architecture/overlay-and-styling.md) | Shadow roots, interaction, geometry, and injected chat CSS |
| [Internationalization](architecture/i18n.md) | The locale generation pipeline and RTL behavior |

Module-specific documents remain next to their code:

- [`entrypoints/content/features/YTDLiveChatIframe/styles/README.md`](../entrypoints/content/features/YTDLiveChatIframe/styles/README.md) — injected CSS cascade contract.
- [`store-assets/concepts/README.md`](store-assets/concepts/README.md) — store image concept catalog.

## Maintainers

See [`maintainers/README.md`](maintainers/README.md).

| Document | What it covers |
| --- | --- |
| [リリース Runbook](maintainers/release-runbook.md) | Candidate creation, proof, and store promotion |
| [実ブラウザ検証](maintainers/verification-browser.md) | Chrome, Opera, and Firefox evidence against YouTube |
| [リポジトリの見せ方](maintainers/repository-presentation.md) | Repository presentation settings |

Store listing manuscripts live under [`store-listing/`](store-listing/) and are validated by `yarn store:check`.

## Not project documentation

[`articles/`](../articles/) contains unpublished external article drafts.

## Keeping documents accurate

Code and executable contracts are authoritative. When behavior changes, update the relevant document in the same pull request.

| Check | Runs in | Enforces |
| --- | --- | --- |
| `yarn verify` | PR quality and local verification | locale/store freshness, Biome, TypeScript, coverage, and Node-side contracts |
| Playwright fixture project | PR browser contracts | deterministic content, popup, route, and lifecycle behavior |
| `scripts/verify/check-package-contracts.mjs` | package verification | manifest, locale inventory, production output, and ZIP contents |
| `scripts/verify/check-release-workflow.mjs` | `yarn check` | release/publish workflow shape |
| `e2e/config/projectClassification.spec.ts` | contract project | every Playwright scenario is classified exactly once |

No script validates prose automatically; stale documentation is itself a defect.
