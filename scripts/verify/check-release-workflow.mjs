#!/usr/bin/env node
import assert from 'node:assert/strict'
import { realpathSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const assertReleaseWorkflows = (candidate, publish) => {
  const candidateTrigger = candidate.slice(candidate.indexOf('on:'), candidate.indexOf('concurrency:'))
  const publishTrigger = publish.slice(publish.indexOf('on:'), publish.indexOf('concurrency:'))

  assert.doesNotMatch(candidateTrigger, /^  push:$/m, 'Merging main must not publish a new version')
  assert.match(candidateTrigger, /^  workflow_dispatch:$/m, 'Candidate creation must be an intentional manual action')
  assert.match(publishTrigger, /^  workflow_dispatch:$/m, 'Store publication must be an intentional manual action')
  assert.match(candidate, /YLC_CANARY_REQUIRE_CLEAN: "1"/, 'Release candidates must require a clean real-YouTube canary')
  assert.match(candidate, /release-proof\.mjs create --commit "\$GITHUB_SHA"/, 'Candidate artifacts must be bound to their source commit')
  assert.match(candidate, /gh release create .* --draft /, 'Verified candidates must remain draft releases')

  assert.match(
    candidate,
    /name: release-candidate-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/,
    'Candidate artifacts must identify their run attempt',
  )
  assert.match(publishTrigger, /candidate_run_id:[\s\S]*required: true/, 'Publication must select a candidate Actions run')
  assert.doesNotMatch(publish, /gh release download/, 'Mutable Release attachments cannot be publication inputs')
  const validation = publish.slice(publish.indexOf('  validate-candidate:'), publish.indexOf('  publish-chrome:'))
  assert.match(validation, /actions: read/, 'Candidate metadata validation needs read-only Actions access')
  assert.match(validation, /if \[\[ "\$GITHUB_REF" != "refs\/heads\/main" \]\]/, 'Publication must reject untrusted dispatch refs')
  assert.ok(
    validation.indexOf('Require trusted publication workflow') < validation.indexOf('uses: actions/checkout'),
    'The dispatch ref must be checked before checkout',
  )
  assert.match(validation, /ref: \$\{\{ github\.sha \}\}/, 'Validation must use the immutable trusted publication source')
  assert.match(
    validation,
    /run: node scripts\/verify\/release-candidate\.mjs/,
    'Publication must validate the candidate workflow and artifact metadata',
  )
  assert.match(
    validation,
    /artifact-ids: \$\{\{ steps\.candidate\.outputs\.artifact_id \}\}/,
    'Candidate download must use the validated immutable artifact ID',
  )
  assert.match(
    validation,
    /run-id: \$\{\{ steps\.candidate\.outputs\.run_id \}\}/,
    'Candidate download must use the validated workflow run',
  )
  assert.match(validation, /github-token: \$\{\{ github\.token \}\}/, 'Cross-run download must use the read-only job token')
  assert.match(
    validation,
    /artifact_id: \$\{\{ steps\.proven\.outputs\.artifact-id \}\}/,
    'The forwarded artifact identity must reach dependent jobs',
  )
  assert.match(publish, /release-proof\.mjs verify/, 'Publication must verify candidate hashes and source commit')
  assert.match(
    validation,
    /--expected-commit "\$CANDIDATE_COMMIT" --expected-version "\$RELEASE_VERSION"/,
    'Proof verification must use the validated candidate commit and requested version',
  )
  assert.doesNotMatch(publish, /ref: v\$\{\{ inputs\.version \}\}/, 'Publishing code cannot be checked out from a mutable tag')
  assert.equal(
    [...publish.matchAll(/ref: \$\{\{ needs\.validate-candidate\.outputs\.commit \}\}/g)].length,
    2,
    'Both stores must use the validated immutable source commit',
  )
  for (const workflow of [candidate, publish]) {
    for (const step of workflow.split(/(?=^      - )/m).filter(step => step.includes('uses: actions/download-artifact@'))) {
      assert.match(step, /digest-mismatch: error/, 'Every release artifact download must fail on a digest mismatch')
    }
  }
  assert.doesNotMatch(publish, /\byarn (?:build|zip)/, 'Publication must never rebuild proven artifacts')
  assert.match(publish, /environment: chrome-web-store/, 'Chrome publication must use a protected environment')
  assert.match(publish, /environment: firefox-add-ons/, 'Firefox publication must use a protected environment')
  assert.match(
    publish,
    /publish-github-release:[\s\S]*needs: \[validate-candidate, publish-chrome, publish-firefox\]/,
    'The public GitHub release must wait for both stores and use the validated artifact',
  )
  const promotion = publish.slice(publish.indexOf('  publish-github-release:'))
  assert.match(
    promotion,
    /artifact-ids: \$\{\{ needs\.validate-candidate\.outputs\.artifact_id \}\}/,
    'Public downloads must use the same verified artifact as the stores',
  )
  assert.match(promotion, /gh release upload[\s\S]*--clobber/, 'Public Release attachments must be restored from verified bytes')
  assert.ok(
    promotion.indexOf('gh release upload') < promotion.indexOf('gh release edit'),
    'Verified attachments must be restored before publication',
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const candidate = await readFile(new URL('../../.github/workflows/cd.yml', import.meta.url), 'utf8')
  const publish = await readFile(new URL('../../.github/workflows/publish.yml', import.meta.url), 'utf8')
  assertReleaseWorkflows(candidate, publish)
  console.log('Release candidate and artifact-promotion workflows are valid')
}
