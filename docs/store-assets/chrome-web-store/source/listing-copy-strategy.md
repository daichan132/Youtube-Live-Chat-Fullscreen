# Listing copy: search relevance and clarity

Prepared on **2026-10-16 (JST)** for all **55 language and region options**. English supplies the shared product facts; each locale uses its own wording for the same benefits and limitations. English regional manuscripts use the same text.

## Prepared copy

| Field | Source |
| --- | --- |
| English detailed description | [en.md](../../../store-listing/en.md), also [en_AU.md](../../../store-listing/en_AU.md), [en_GB.md](../../../store-listing/en_GB.md), [en_US.md](../../../store-listing/en_US.md) |
| Japanese detailed description | [ja.md](../../../store-listing/ja.md) |
| Short descriptions and source references | [copy.json](../copy.json) |
| Package short descriptions | [English](../../../../shared/i18n/assets/en.json), [Japanese](../../../../shared/i18n/assets/ja.json), and the three regional English source files |
| All locale manuscripts and review hashes | [Locale index](listing-copy-locales.md), [hash inventory](listing-copy-locales.json) |

English package title: **YouTube Live Chat Fullscreen**.

English short description, **128 characters**:

> Watch YouTube in fullscreen with a live chat overlay. Send messages and Super Chats, and adjust size, position and transparency.

Japanese package title: **YouTube Live Chat Fullscreen — 全画面でライブチャット**.

Japanese short description, **73 characters**:

> YouTubeの全画面動画にライブチャットを重ねて表示。コメントやスーパーチャットを送信でき、チャットの位置・サイズ・背景の透明度も調整できます。

All 55 package titles and summaries are synchronized to authored translation sources and generated manifest messages. Titles range from **28 to 66 UTF-16 characters**; summaries range from **62 to 131**, within the 75/132-character limits. English uses the exact formal brand. Non-English titles pair that brand with one localized functional descriptor; they do not add ratings, superlatives, competitor names or unrelated keywords. The [package metadata inventory](package-metadata.md) lists every final title and summary.

## Search intent and structure

These are feature-based editorial targets, not measured search-volume data:

| Intent | English wording | Japanese wording | Placement |
| --- | --- | --- | --- |
| Keep chat while watching a large video | YouTube live chat, fullscreen, full screen | YouTube、全画面、ライブチャット、フルスクリーン | Short description and opening |
| Put chat over the picture | chat overlay, transparent background | チャットを重ねて表示、背景を透過 | Opening and customization list |
| Keep the video visible | move and resize, opacity and blur | 位置・サイズ・透明度・ぼかし | Main features |
| Watch an earlier broadcast with its conversation | archived streams, chat replay | アーカイブ、チャットリプレイ | Detailed description and supported use cases |
| Participate during a live stream | post messages, Super Chats | コメントを送信、スーパーチャット | Short description plus qualified posting section |

The opening states the viewing benefit before setup details. The following sections cover use cases, customization, participation, setup, price, privacy and compatibility. Gaming and VTuber viewing appear once as concrete examples. Short and detailed descriptions are written separately rather than repeated verbatim. There is no public-facing keyword list, competitor-name list, rating claim or promised search position.

## Plain-language editing

The user requested the installed **yomiyasu** skill. Its principles of preserving meaning, keeping conditions explicit, avoiding invented benefits and using concrete everyday wording were applied to all locales. Japanese grammar guidance was used for Japanese; other languages were edited according to their own word order and vocabulary. Headings name their topic, and the opening describes watching and participating rather than making an unsupported claim about a better experience.

Every manuscript received a writing pass and a separate AI-assisted review. Corrections clarified chat replay versus a new live conversation, opacity versus blur, messages versus private direct messages, and chat appearance versus a person's appearance. The Arabic summary check now accepts the natural broken plural for sending messages while still rejecting reading-only or video-comment claims. The Hungarian summary check recognizes sending chat messages rather than comments beneath a video, with regression examples for both a lost posting capability and the wrong surface.

Japanese yomiyasu lint and diff checks were run, followed by contextual review. The retained list-density candidate reflects five parallel feature items and three setup steps. Repeated polite endings in compatibility statements were retained where they read naturally. Lint output is an editing aid, not proof of human authorship or translation quality. Native-speaker proofreading of every locale has not been performed.

## Accuracy boundaries

The feature review used [the user guide](../../../user-guide.md), [chat availability decisions](../../../../entrypoints/content/runtime/resolveChatDecision.ts), [settings model](../../../../shared/settings/model.ts), [package policy](../../../../config/packagePolicy.ts) and [font loading](../../../../entrypoints/content/style/fontLoader.ts).

- Posting requires login; Super Chats and other platform features depend on eligibility and channel settings. The free extension does not make paid platform features free.
- Archives need available chat replay. A video without chat does not gain a new conversation.
- Presets save appearance; they do not imply automatic account synchronization. Hiding usernames and avatars applies to ordinary messages.
- Settings use local browser storage. Native chat and optional Google Fonts still connect to their services; the copy does not claim offline operation or zero network traffic.
- “55 language options” includes regional locales. Opera compatibility is conditional; Firefox has a separate distribution.

## Official guidance checked

The following official pages were read on **2026-10-16**:

- [Creating a great listing page](https://developer.chrome.com/docs/webstore/best-listing): the summary is limited to 132 characters and appears in discovery surfaces. Lead with the main use case and use a clear overview plus a short feature list.
- [Listing Requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements): metadata must be accurate; irrelevant or excessive keyword use is prohibited.
- [Spam policy FAQ](https://developer.chrome.com/docs/webstore/program-policies/spam-faq): relevance and context matter, and the short summary need not be copied into the detailed description. Its keyword-count guidance is not a universal word-density target.

The [public English listing](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd?hl=en) was also read. Its broad account-free wording is replaced with a distinction between an extension account and login needed for participation. No search volumes, placement changes or conversion improvement were measured in this copy pass.

## Validation and publication

Checks passed for all 55 title and summary lengths, required posting capabilities, consistent English regional copy, generated translations and store-manuscript contracts. Cross-reviews checked final metadata for unsupported claims, ambiguous posting wording and keyword stuffing. `yarn verify` passed **968 tests** (799 core/DOM and 169 contracts), with five existing CSS warnings. `yarn test:package` built fresh Chrome and Firefox production packages and passed their contracts. All 55 titles and 55 summaries matched their authored sources in both production ZIPs (**220 checks**). The [inventory](listing-copy-locales.json) records description/title/summary hashes, 148 checked local documentation links and the review scope. The Git diff was also checked.

The package metadata in this pass is prepared repository copy and awaits the normal GitHub Actions release. This pass did not change the dashboard, public listing, version or release tags. See the [asset work list](../../../store-listing/asset-work-list.md) for publication work and the [asset guide](../README.md) for the selected images and retained sources.
