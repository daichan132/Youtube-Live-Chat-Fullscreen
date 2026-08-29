#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const candidate = await readFile(new URL('../../.github/workflows/cd.yml', import.meta.url), 'utf8')
const publish = await readFile(new URL('../../.github/workflows/publish.yml', import.meta.url), 'utf8')
const candidateTrigger = candidate.slice(candidate.indexOf('on:'), candidate.indexOf('concurrency:'))
const publishTrigger = publish.slice(publish.indexOf('on:'), publish.indexOf('concurrency:'))

assert.doesNotMatch(candidateTrigger, /^  push:$/m, 'Merging main must not publish a new version')
assert.match(candidateTrigger, /^  workflow_dispatch:$/m, 'Candidate creation must be an intentional manual action')
assert.match(publishTrigger, /^  workflow_dispatch:$/m, 'Store publication must be an intentional manual action')
assert.match(candidate, /YLC_CANARY_REQUIRE_CLEAN: "1"/, 'Release candidates must require a clean real-YouTube canary')
assert.match(candidate, /release-proof\.mjs create --commit "\$GITHUB_SHA"/, 'Candidate artifacts must be bound to their source commit')
assert.match(candidate, /gh release create .* --draft /, 'Verified candidates must remain draft releases')

assert.match(publish, /gh release download/, 'Publication must download existing candidate assets')
assert.match(publish, /release-proof\.mjs verify/, 'Publication must verify candidate hashes and source commit')
assert.doesNotMatch(publish, /\byarn (?:build|zip)/, 'Publication must never rebuild proven artifacts')
assert.match(publish, /environment: chrome-web-store/, 'Chrome publication must use a protected environment')
assert.match(publish, /environment: firefox-add-ons/, 'Firefox publication must use a protected environment')
assert.match(publish, /publish-github-release:[\s\S]*needs: \[publish-chrome, publish-firefox\]/, 'The public GitHub release must wait for both stores')

console.log('Release candidate and artifact-promotion workflows are valid')
