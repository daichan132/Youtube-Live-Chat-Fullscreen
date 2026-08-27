#!/usr/bin/env node
// Verifies Chrome Web Store listing sources: title/summary sources in
// shared/i18n/assets and description manuscripts in docs/store-listing.
//
// Limits: extension name <= 75 and summary <= 132 characters, per
// https://developer.chrome.com/docs/extensions/reference/manifest (name,
// description). The Chrome Web Store documents no maximum for the detailed
// description; descriptions are only required to be present here.
//
// SUMMARY_CAPABILITIES guards against one regression that shipped twice: a summary
// that names sending a Super Chat while the ordinary-comment capability drops out
// of the sentence entirely, so the listing reads as if only the paid action were
// possible. It catches that, in all 55 locales.
//
// It does NOT catch a demotion. Red-teaming defeated an earlier, noun-only version
// of this table in five locales out of five by rewriting "post a comment" as "read
// comments": the noun survives, the capability does not. Patterns anchored on a
// posting verb resist that; patterns anchored on a noun do not, and a 132-character
// summary in 55 languages does not admit a reliable mechanical test for it. Treat a
// passing run as evidence that nothing vanished, never as evidence that a
// translation is accurate or reads naturally. Only a native reader establishes that.
//
// --snapshot compares local descriptions against the newest
// docs/store-listing/chrome-dashboard-snapshot-*.json capture and lists the
// locales whose dashboard text is out of date. Differences are informational:
// the repository is expected to run ahead of the dashboard between updates.
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { SUMMARY_CAPABILITIES } from './summaryCapabilities.mjs'

const NAME_LIMIT = 75
const SUMMARY_LIMIT = 132
const REQUIRED_URLS = [
  'https://github.com/daichan132/Youtube-Live-Chat-Fullscreen/issues',
  'https://github.com/daichan132/Youtube-Live-Chat-Fullscreen',
  'https://ko-fi.com/daichan132',
]
// Tokens that stay verbatim in every locale because they are proper nouns,
// identifiers, or standards references. They stand in for the description's
// structure: losing one means a translation dropped the section that carries it.
const REQUIRED_TOKENS = ['YouTube', 'Opera', 'GitHub', 'GPL-3.0', 'activeTab', 'storage', 'Google Fonts', 'WCAG 2.1']
// Blocks (blank-line separated) the reference manuscript has; translations may
// merge or split a little, but a large gap means missing content.
const BLOCK_TOLERANCE = 3
const REFERENCE_LOCALE = 'en'
const NON_LOCALE_MARKDOWN = new Set(['asset-work-list.md'])

const assetsDir = fileURLToPath(new URL('../../shared/i18n/assets/', import.meta.url))
const listingDir = fileURLToPath(new URL('../../docs/store-listing/', import.meta.url))
const snapshotMode = process.argv.includes('--snapshot')

const failures = []
const fail = message => failures.push(message)

const localeCodes = (await readdir(assetsDir))
  .filter(name => name.endsWith('.json'))
  .map(name => name.slice(0, -'.json'.length))
  .sort()

const listingEntries = await readdir(listingDir)
const markdownFiles = listingEntries.filter(name => name.endsWith('.md'))
const listingLocales = new Set(markdownFiles.filter(name => !NON_LOCALE_MARKDOWN.has(name)).map(name => name.slice(0, -'.md'.length)))

for (const code of localeCodes) {
  if (!listingLocales.has(code)) fail(`docs/store-listing/${code}.md is missing for locale ${code}`)
}
for (const code of listingLocales) {
  if (!localeCodes.includes(code)) fail(`docs/store-listing/${code}.md has no matching shared/i18n/assets/${code}.json`)
}

const descriptions = new Map()
for (const code of localeCodes) {
  const asset = JSON.parse(await readFile(`${assetsDir}${code}.json`, 'utf8'))
  const name = asset.extensionName ?? ''
  const summary = asset.extensionDescription ?? ''
  if (!name.trim()) fail(`${code}: extensionName is empty`)
  if (!summary.trim()) fail(`${code}: extensionDescription is empty`)
  if (name.length > NAME_LIMIT) fail(`${code}: extensionName is ${name.length} characters (limit ${NAME_LIMIT})`)
  if (summary.length > SUMMARY_LIMIT) fail(`${code}: extensionDescription is ${summary.length} characters (limit ${SUMMARY_LIMIT})`)
  const capabilities = SUMMARY_CAPABILITIES[code]
  if (capabilities === undefined) {
    fail(`${code}: no SUMMARY_CAPABILITIES entry — add this locale's comment and Super Chat patterns before shipping it`)
  }
  for (const pattern of capabilities ?? []) {
    if (!pattern.test(summary)) {
      fail(`${code}: extensionDescription no longer matches ${pattern} — the ordinary-comment or Super Chat capability dropped out of this summary`)
    }
  }

  if (!listingLocales.has(code)) continue
  const description = await readFile(`${listingDir}${code}.md`, 'utf8')
  descriptions.set(code, description)
  if (!description.trim()) fail(`${code}.md: description is empty`)
  for (const url of REQUIRED_URLS) {
    if (!description.includes(url)) fail(`${code}.md: missing required URL ${url}`)
  }
  for (const token of REQUIRED_TOKENS) {
    if (!description.includes(token)) fail(`${code}.md: missing "${token}" — the section carrying it was probably dropped in translation`)
  }
  if (!description.includes(String(localeCodes.length))) {
    fail(`${code}.md: locale count "${localeCodes.length}" not found (locale set changed? update the copy)`)
  }
  if (description.includes('opera://')) {
    fail(`${code}.md: contains browser-specific troubleshooting (opera://); keep listings uniform and move steps to the support page`)
  }
  const trailing = description.trimEnd().split('\n').slice(-REQUIRED_URLS.length)
  if (!trailing.every((line, index) => line.includes(REQUIRED_URLS[index]))) {
    fail(`${code}.md: the last ${REQUIRED_URLS.length} lines must be the labelled support links, in the reference order`)
  }
}

const blockCount = text => text.trim().split(/\n\s*\n/).length
const referenceBlocks = descriptions.has(REFERENCE_LOCALE) ? blockCount(descriptions.get(REFERENCE_LOCALE)) : null
if (referenceBlocks === null) {
  fail(`reference manuscript docs/store-listing/${REFERENCE_LOCALE}.md is missing`)
} else {
  for (const [code, description] of descriptions) {
    const blocks = blockCount(description)
    if (Math.abs(blocks - referenceBlocks) > BLOCK_TOLERANCE) {
      fail(`${code}.md has ${blocks} blocks against the reference ${referenceBlocks} (tolerance ${BLOCK_TOLERANCE}) — a section is missing or duplicated`)
    }
  }
}

if (snapshotMode) {
  const snapshotName = listingEntries
    .filter(name => /^chrome-dashboard-snapshot-.*\.json$/.test(name))
    .sort()
    .at(-1)
  if (!snapshotName) {
    fail('no chrome-dashboard-snapshot-*.json found in docs/store-listing')
  } else {
    const snapshot = JSON.parse(await readFile(`${listingDir}${snapshotName}`, 'utf8'))
    const toRepoCode = dashboardCode => (dashboardCode === 'iw' ? 'he' : dashboardCode.replaceAll('-', '_'))
    const dashboardCodes = Object.keys(snapshot.locales)
    const stale = []
    for (const dashboardCode of dashboardCodes) {
      const repoCode = toRepoCode(dashboardCode)
      const local = descriptions.get(repoCode)
      if (local === undefined) {
        fail(`snapshot locale ${dashboardCode} has no local file docs/store-listing/${repoCode}.md`)
        continue
      }
      if (local.trim() !== snapshot.locales[dashboardCode].description.trim()) stale.push(dashboardCode)
    }
    for (const code of localeCodes) {
      const dashboardCode = code === 'he' ? 'iw' : code.replaceAll('_', '-')
      if (!dashboardCodes.includes(dashboardCode)) fail(`locale ${code} is missing from dashboard snapshot ${snapshotName}`)
    }
    console.log(`Snapshot ${snapshotName}: ${stale.length}/${dashboardCodes.length} dashboard locales differ from the local manuscripts`)
    if (stale.length > 0) console.log(`Dashboard locales to update: ${stale.join(', ')}`)
  }
}

if (failures.length > 0) {
  for (const message of failures) console.error(`store-listing check failed: ${message}`)
  process.exit(1)
}
console.log(`Checked store listing sources for ${localeCodes.length} locales`)
