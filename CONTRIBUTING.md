# Contributing

Bug reports, focused feature proposals, documentation fixes, translations, and pull requests are welcome.

## Development setup

Use Node.js 24 and the Yarn version declared in `package.json`.

```bash
corepack enable
yarn install
yarn dev
```

`yarn dev` starts the Chrome development build. Use `yarn dev:firefox` for Firefox.

## Before opening a pull request

Run the checks that match the change:

```bash
yarn check
yarn test:unit
yarn build
```

Run `yarn build:firefox` for changes that can affect cross-browser behavior. Runtime behavior changes should also run the relevant deterministic Playwright project described in [`docs/testing/contracts.md`](docs/testing/contracts.md).

Keep pull requests focused. Avoid mixing runtime behavior, broad formatting, dependency updates, and documentation changes unless they are required by the same outcome.

## Translations

Runtime translations live in `shared/i18n/assets/*.json`. Update the source locale files, regenerate derived assets, and verify them:

```bash
node scripts/generate-locales.mjs
yarn locales:check
```

Do not edit `public/locales`, `public/_locales`, or `shared/i18n/generated` by hand.

## Screenshots

Store and documentation screenshots are captured by the dedicated Playwright project:

```bash
yarn capture:store-assets
```

Review every changed image at full size. Do not update visual baselines to hide an unexplained rendering difference.

## Reporting bugs

Use the [bug report form](https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues/new?template=bug.yml) and include the browser, extension version, YouTube URL type, reproduction steps, and screenshots or recordings when available.

Security vulnerabilities must follow [SECURITY.md](SECURITY.md), not a public issue.
