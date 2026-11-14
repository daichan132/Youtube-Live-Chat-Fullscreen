# Chrome Web Store Listing — YouTube Live Chat Fullscreen

Last updated: 2026-11-15

## Store listing

- Name: YouTube Live Chat Fullscreen (`extensionName`, English manifest locale).
- Short description: Watch YouTube in fullscreen with a live chat overlay. Send messages and Super Chats, and adjust size, position and transparency.
- Detailed descriptions: [English manuscript](docs/store-listing/en_US.md) and the other locale manuscripts in [docs/store-listing](docs/store-listing).
- Single purpose: Keep YouTube's live chat or available chat replay over the fullscreen video, with controls to adjust its appearance and placement.
- Primary language: English; 55 interface languages.
- Current public category: Entertainment.
- Public listing: https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd

The manuscripts and authored locale files remain the editable sources for listing text. This update adds adjustable text-shadow strength and values that appear only while moving a slider. It also fixes text sizing, makes resize edges easier to grab, and improves Firefox backup import.

## Graphics and assets

Existing listing assets and their sources are documented in [the store-assets guide](docs/store-assets/chrome-web-store/README.md). A package submission does not update those dashboard assets. Screenshots showing the settings panel should be refreshed to show the aligned sliders and values displayed during adjustment. Existing screenshots and their publication state must be checked in the dashboard rather than inferred from local files.

## Permissions justification

- `storage`: remember the viewer's appearance, placement, presets and extension preferences in this browser, and restore them on the next visit.
- Content-script match `https://www.youtube.com/*`: display and manage the chat overlay on YouTube's fullscreen player, including available chat replay. There is no separate broad host-permission grant.
- The settings resource is accessible only to matching YouTube pages so the viewer can edit the overlay settings within the player.

This release does not add permissions. See [package policy](config/packagePolicy.ts).

## Privacy and data use

The extension has no analytics, tracking service or developer-operated data collection. Settings remain in local browser storage; viewing activity and chat content are not sent to the developer. YouTube's native chat communicates with YouTube. Optional font choices may fetch fonts from Google Fonts. See [the privacy description](README.md#privacy--permissions).

The public listing declares no data collection or use. Data is not sold, used for unrelated purposes, or used to determine creditworthiness. No separate developer privacy-policy link is shown in the current public listing; the existing disclosure remains unchanged for this update.

## Distribution and developer

- Visibility: public; preserve the existing dashboard region selection.
- Owner: daichan132.
- Public contact email: daichan133322@gmail.com.
- Support: https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues
- Homepage: https://daichan132.github.io/Youtube-Live-Chat-Fullscreen-Docs/

## Version history

- **2.3.19 — 2026-11-15 — Preparing candidate.** Fix font-size reflection, add text-shadow strength, align slider widths with the other menus, show values only while adjusting, enlarge resize targets, support legacy channel live URLs, and keep Firefox backup import in an extension tab.
- **2.3.18 — Published.** Public Chrome and Firefox listing versions checked on 2026-11-15. Publication date and older changes are recorded in [GitHub Releases](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/releases).

## Review notes

Follow [the release runbook](docs/maintainers/release-runbook.md). Candidate creation, candidate-specific browser review, store submission and public availability are separate states. Record the candidate artifact ID, ZIP hashes, exact browser versions, tested paths and unverified paths in the candidate release notes before submission. Local development-build results do not establish review of the candidate ZIPs.
