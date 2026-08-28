# Firefox source-code review

This archive contains the source and pinned toolchain needed to rebuild the Firefox package submitted to Mozilla Add-ons. Store screenshots, browser fixtures, test reports, and repository-only documentation are excluded because they do not participate in the extension build.

## Toolchain

- Ubuntu 24.04 in the release workflow
- Node.js 24, also recorded in `mise.toml`
- Yarn 4.18.0, pinned by `.yarnrc.yml` and bundled in `.yarn/releases/`

The build does not require environment variables, private packages, remote build assets, or generated secrets. Dependencies are resolved from `yarn.lock`. Runtime and manifest locale assets are committed under `public/`, and their TypeScript metadata is committed under `shared/i18n/generated/`.

## Rebuild

From the extracted source archive:

```bash
corepack enable
yarn install --immutable
yarn zip:firefox
```

The command creates the unpacked extension at `.output/firefox-mv2/`, the distributable Firefox ZIP, and the source ZIP.

Production artifacts are created once in the release-candidate workflow, checked against package and browser contracts, and bound to the source commit by SHA-256. Publication downloads and submits those exact bytes without rebuilding them.
