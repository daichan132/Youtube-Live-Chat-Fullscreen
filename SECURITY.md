# Security Policy

## Supported versions

Security fixes are applied to the latest published version of YouTube Live Chat Fullscreen. Update the extension before reporting a problem that may already be fixed.

## Scope

The extension's attack surface is deliberately small. The permission set and the page-match pattern below are pinned by [`check-package-contracts.mjs`](scripts/verify/check-package-contracts.mjs); the rest hold by construction and are reviewable in this repository:

- It requests only the `activeTab` and `storage` permissions, and no host permissions.
- It runs on `www.youtube.com` only.
- It has no account system, no analytics, and no reporting endpoint. It reads the network in exactly two cases: its own bundled locale files, and — only once you choose a font other than the default — that font's stylesheet from Google Fonts.
- Diagnostic reports are sanitized before export and cannot contain URLs, video IDs, chat text, or user names.

Reports about any of those boundaries being broken are especially welcome. So are reports about the extension mishandling content from the YouTube page it runs alongside, or about anything that could leak settings between origins.

Findings in YouTube itself belong to Google, not here.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub's private vulnerability reporting for this repository. If that option is unavailable, contact the maintainer through the email listed on the [Chrome Web Store page](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd).

Include:

- The affected extension version and browser
- A concise description of the impact
- Reproduction steps or a minimal proof of concept
- Whether the report can be disclosed after a fix

When attaching evidence, prefer the sanitized diagnostic report available from the settings panel over raw screenshots or logs, and remove any personal data from a proof of concept before sending it.

## What to expect

This is a single-maintainer project, so please read these as intentions rather than guarantees:

- An acknowledgement within about a week.
- An assessment of severity and a plan once the report is reproduced.

Shipping a fix takes longer than merging it. Releases go through a manual two-stage pipeline and then through Chrome Web Store and Firefox Add-ons review, so the interval between a fix landing on `main` and reaching users is measured in days, not hours, and is largely outside the maintainer's control.

Please avoid accessing other users' data, disrupting YouTube, or publishing the vulnerability before the maintainer has had a reasonable opportunity to investigate.
