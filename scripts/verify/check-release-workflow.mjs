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

console.log('Release workflow contract is valid')
