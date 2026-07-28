#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const workflow = await readFile(new URL('../../.github/workflows/cd.yml', import.meta.url), 'utf8')
const triggerBlock = workflow.slice(workflow.indexOf('on:'), workflow.indexOf('concurrency:'))

assert.match(triggerBlock, /^  push:$/m, 'Release workflow must run on pushes')
assert.match(triggerBlock, /^    branches:\n      - main$/m, 'Release workflow push trigger must target main')
assert.match(triggerBlock, /^  workflow_dispatch:$/m, 'Release workflow must retain manual retries')
assert.match(workflow, /^  release-gate:$/m, 'Release workflow must gate duplicate versions')
assert.match(workflow, /git rev-parse "refs\/tags\/v\$VERSION"/, 'Release gate must check the current version tag')
assert.match(workflow, /GITHUB_EVENT_NAME/, 'Release gate must distinguish push from manual retries')
assert.match(
  workflow,
  /^    if: \$\{\{ needs\.release-gate\.outputs\.should_release == 'true' \}\}$/m,
  'Packaging must only run when the release gate opens',
)
assert.ok(workflow.indexOf('run: yarn locales:check') < workflow.indexOf('run: yarn check'), 'Locale check must precede source checks')
assert.match(workflow, /run: yarn test:coverage/, 'Release workflow must enforce the coverage ratchet')
assert.match(workflow, /run: yarn test:contracts/, 'Release workflow must run Node-side contracts')
assert.match(workflow, /run: yarn verify:package-contracts/, 'Release workflow must verify production package contracts')
assert.match(workflow, /run: yarn build:e2e/, 'Release workflow must build the testing extension')
assert.match(
  workflow,
  /run: yarn playwright install --with-deps chromium/,
  'Release workflow must install Playwright Chromium',
)
const browserCommand =
  'run: xvfb-run --auto-servernum yarn playwright test --project=fixture --project=visual --project=accessibility --retries=0 --max-failures=1'
assert.ok(workflow.includes(browserCommand), 'Release workflow must run every deterministic browser gate without retries')
assert.match(workflow, /name: release-browser-contracts-\$\{\{ github\.sha \}\}/, 'Release browser diagnostics must be retained')
assert.ok(
  workflow.indexOf('run: yarn verify:package-contracts') < workflow.indexOf('- name: Upload release packages'),
  'Production package contracts must pass before packages are uploaded',
)
assert.ok(
  workflow.indexOf(browserCommand) < workflow.indexOf('- name: Upload release packages'),
  'Deterministic browser contracts must pass before packages are uploaded',
)

console.log('Release workflow contract is valid')
