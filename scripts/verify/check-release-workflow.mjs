#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const candidate = await readFile(new URL('../../.github/workflows/cd.yml', import.meta.url), 'utf8')
const publish = await readFile(new URL('../../.github/workflows/publish.yml', import.meta.url), 'utf8')
const candidateTrigger = candidate.slice(candidate.indexOf('on:'), candidate.indexOf('concurrency:'))
const publishTrigger = publish.slice(publish.indexOf('on:'), publish.indexOf('concurrency:'))

assert.doesNotMatch(candidateTrigger, /^  push:$/m, 'Merging main must not publish a new version')
assert.match(candidateTrigger, /^  workflow_dispatch:$/m, 'Candidate creation must be an intentional manual action')
assert.match(candidateTrigger, /^      real_browser_verified:$/m, 'Candidate creation must require real-browser confirmation')
assert.match(candidateTrigger, /^      real_browser_evidence:$/m, 'Candidate creation must record concrete real-browser evidence')
assert.match(publishTrigger, /^  workflow_dispatch:$/m, 'Store publication must be an intentional manual action')
assert.match(publishTrigger, /^      version:$/m, 'Publication must select an existing candidate version')

for (const command of ['yarn locales:check', 'yarn check', 'yarn test:coverage', 'yarn test:contracts']) {
  assert.match(candidate, new RegExp(`run: ${command.replaceAll(':', '\\:')}`), `Candidate workflow must run ${command}`)
}
assert.match(candidate, /run: yarn verify:package-contracts/, 'Candidate workflow must verify production package contracts')
assert.match(candidate, /--project=fixture --project=visual --project=accessibility --retries=0/, 'Deterministic gates must run without retries')
assert.match(candidate, /run: xvfb-run --auto-servernum yarn e2e:production:chrome/, 'The exact Chrome ZIP must boot before attestation')
assert.match(candidate, /YLC_EXTENSION_OUTPUT_DIR: \.output\/production-smoke\/chrome/, 'The canary must use the extracted production ZIP')
assert.match(candidate, /YLC_CANARY_SUMMARY_PATH: test-results\/release-canary-summary\.json/, 'The hosted canary must emit a machine-readable result')
assert.match(candidate, /classify-release-canary\.mjs/, 'The hosted canary must distinguish external unavailability from product failures')
assert.match(candidate, /--real-browser-evidence "\$REAL_BROWSER_EVIDENCE"/, 'Candidate proof must include real-browser evidence')
assert.match(candidate, /release-proof\.mjs create --commit "\$GITHUB_SHA"/, 'Candidate hashes and commit must be attested')
assert.match(candidate, /release-proof-v\$\{\{ steps\.version\.outputs\.version \}\}\.json/, 'Release proof must travel with package assets')
assert.match(candidate, /gh release create .* --draft /, 'Verified candidates must remain draft releases')

assert.match(publish, /gh release download/, 'Publication must download existing candidate assets')
assert.match(publish, /release-proof\.mjs verify/, 'Publication must verify candidate hashes')
assert.match(publish, /--expected-commit "\$\(git rev-parse HEAD\)"/, 'Publication must bind proof to the checked-out tag')
assert.doesNotMatch(publish, /\byarn (?:build|zip)/, 'Publication must never rebuild proven artifacts')
assert.match(publish, /environment: chrome-web-store/, 'Chrome publication must use a protected environment')
assert.match(publish, /environment: firefox-add-ons/, 'Firefox publication must use a protected environment')
assert.match(publish, /publish-github-release:[\s\S]*needs: \[publish-chrome, publish-firefox\]/, 'The public GitHub release must wait for both stores')

console.log('Release candidate and artifact-promotion workflows are valid')
