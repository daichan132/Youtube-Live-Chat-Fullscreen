# Security Policy

## Supported versions

Security fixes are applied to the latest published version of YouTube Live Chat Fullscreen. Update the extension before reporting a problem that may already be fixed.

## Scope

The production package is checked against the [package policy](config/packagePolicy.ts) by [`check-package-contracts.mjs`](scripts/verify/check-package-contracts.mjs):

- It requests only the `storage` permission, with no host permissions.
- It runs on `www.youtube.com` only.
- It has no extension account, analytics, or reporting endpoint. Settings stay in the browser. Bundled locale files are loaded from the extension package; optional fonts are loaded from Google Fonts. YouTube's own chat continues to communicate with YouTube.
- Diagnostic reports are sanitized before export and cannot contain URLs, video IDs, chat text, or user names.

Please report violations of these privacy and permission limits, mishandling of YouTube page content, or settings leaking between origins.

Findings in YouTube itself belong to Google, not here.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability.

Use GitHub's private vulnerability reporting for this repository. If that option is unavailable, contact the maintainer through the email listed on the [Chrome Web Store page](https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd).

Include:

- The affected extension version and browser
- A concise description of the impact
- Reproduction steps or a minimal proof of concept
- Whether the report can be disclosed after a fix

When attaching evidence, include reproduction steps and remove personal data from screenshots, logs, and proof-of-concept files before sending them.

## What to expect

This is a single-maintainer project, so please read these as intentions rather than guarantees:

- An acknowledgement within about a week.
- An assessment of severity and a plan once the report is reproduced.

A merged fix is not immediately available to users. A maintainer must prepare and publish a release, which then goes through Chrome Web Store and Firefox Add-ons review. Release and review times vary.

Please avoid accessing other users' data, disrupting YouTube, or publishing the vulnerability before the maintainer has had a reasonable opportunity to investigate.
