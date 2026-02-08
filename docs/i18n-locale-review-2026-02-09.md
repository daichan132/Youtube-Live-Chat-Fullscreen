# i18n Locale Review (2026-02-09)

## Scope
- Reviewed translation quality for all locales in:
  - `shared/i18n/assets/*.json`
  - `public/_locales/*/messages.json`
- Focused on high-confidence improvements:
  - Untranslated English leftovers
  - Label style consistency for popup strings
  - Locale contract gaps between shared assets and extension locales

## Decisions
1. `popup.showChatOnFullscreen` is treated as a noun label in all locales.
2. `extensionName` is translated for non-English locales.
3. Brand product names (`Chrome`, `Firefox`) remain untranslated.
4. Some words are intentionally identical to English in specific locales when they are natural loanwords/cognates.

## Updated Wording (High-Confidence)
- `shared/i18n/assets/en*.json`
  - `popup.showChatOnFullscreen`: `Fullscreen Chat`
- `shared/i18n/assets/ja.json`
  - `popup.showChatOnFullscreen`: `全画面チャット`
- `shared/i18n/assets/id.json`
  - `popup.showChatOnFullscreen`: `Chat Layar Penuh`
- `shared/i18n/assets/fil.json`
  - `content.setting.header.preset`: `Mga Preset`
  - `popup.showChatOnFullscreen`: `Fullscreen na Chat`
- `public/_locales/fil/messages.json`
  - `extensionName`: `YouTube Live Chat sa Buong Screen`

## Contract Rules Added to Tests
- `shared/i18n/assets.spec.ts`
  - all locales have identical key sets
  - no empty strings
  - non-English locales do not keep disallowed English strings
- `shared/i18n/publicLocales.spec.ts`
  - locale set parity between shared assets and `public/_locales`
  - `extensionName` and `extensionDescription` are always non-empty
  - non-English locales do not keep English `extensionName`

## English-String Whitelist Rationale
- The following values are allowed to remain equal to English when they are common/native loanwords in target locales:
  - `content.preset.transparentTitle` in `ca`, `de`, `fil`, `fr`, `ro`, `sv`
  - `content.preset.simpleTitle` in `ca`, `es_419`, `fil`, `fr`
  - `popup.links` in `da`, `pt_BR`, `pt_PT`
