#!/usr/bin/env node
import assert from 'node:assert/strict'
import { realpathSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const workflowJob = (workflow, name) => {
  const jobsStart = workflow.search(/^jobs:[ \t]*$/m)
  assert.ok(jobsStart >= 0, 'Release workflow must declare jobs')
  const jobs = workflow.slice(jobsStart)
  const headings = [...jobs.matchAll(/^ {2}([\w-]+):[ \t]*$/gm)]
  const matches = headings.filter(heading => heading[1] === name)
  assert.equal(matches.length, 1, `Release workflow must declare exactly one ${name} job`)
  const heading = matches[0]
  const next = headings[headings.indexOf(heading) + 1]
  return jobs.slice(heading.index, next?.index)
}

const workflowSteps = job => job.split(/(?=^ {6}- )/m).slice(1)

const requireActionStep = (job, action, label) => {
  const matches = workflowSteps(job).filter(step =>
    step.split('\n').some(line => line.startsWith(`      - uses: ${action}@`) || line.startsWith(`        uses: ${action}@`)),
  )
  assert.equal(matches.length, 1, `${label} must have exactly one ${action} step`)
  return matches[0]
}

export const assertReleaseWorkflows = (candidate, publish) => {
  const candidateTrigger = candidate.slice(candidate.indexOf('on:'), candidate.indexOf('concurrency:'))
  const publishTrigger = publish.slice(publish.indexOf('on:'), publish.indexOf('concurrency:'))

  assert.doesNotMatch(candidateTrigger, /^ {2}push:$/m, 'Merging main must not publish a new version')
  assert.match(candidateTrigger, /^ {2}workflow_dispatch:$/m, 'Candidate creation must be an intentional manual action')
  assert.match(publishTrigger, /^ {2}workflow_dispatch:$/m, 'Store publication must be an intentional manual action')
  const candidateVerification = workflowSteps(workflowJob(candidate, 'verify-and-package')).filter(step =>
    step.includes('run: xvfb-run --auto-servernum yarn verify:release:ci'),
  )
  assert.equal(candidateVerification.length, 1, 'Candidate must run deterministic release verification')
  assert.doesNotMatch(candidateVerification[0], /(?:continue-on-error|if):/, 'Candidate verification cannot be optional')
  assert.match(candidate, /release-proof\.mjs create --commit "\$GITHUB_SHA"/, 'Candidate artifacts must be bound to their source commit')
  assert.match(candidate, /gh release create .* --draft /, 'Verified candidates must remain draft releases')

  assert.match(
    candidate,
    /name: release-candidate-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/,
    'Candidate artifacts must identify their run attempt',
  )
  assert.match(publishTrigger, /candidate_run_id:[\s\S]*required: true/, 'Publication must select a candidate Actions run')
  assert.doesNotMatch(publish, /gh release download/, 'Mutable Release attachments cannot be publication inputs')
  const validation = workflowJob(publish, 'validate-candidate')
  const validationCheckout = requireActionStep(validation, 'actions/checkout', 'Candidate validation')
  const validationDownload = requireActionStep(validation, 'actions/download-artifact', 'Candidate validation')
  assert.match(validation, /actions: read/, 'Candidate metadata validation needs read-only Actions access')
  const trustedRefGuards = workflowSteps(validation)
    .map(step => ({
      step,
      guard: step.match(/^ {10}if \[\[ "\$GITHUB_REF" != "refs\/heads\/main" \]\]; then[ \t]*\n([\s\S]*?)(?=^ {10}(?:elif|else|fi)\b)/m),
    }))
    .filter(({ guard }) => guard)
  assert.equal(trustedRefGuards.length, 1, 'Publication must reject untrusted dispatch refs in exactly one guard step')
  const { step: trustedRefStep, guard: trustedRefGuard } = trustedRefGuards[0]
  assert.match(trustedRefStep, /^ {8}run: \|[ \t]*$/m, 'The trusted-ref guard must run as a shell step')
  assert.match(
    trustedRefGuard[1],
    /^ {12}exit[ \t]+1(?:[ \t]+#.*)?[ \t]*$/m,
    'Non-main publication must exit with failure inside its branch',
  )
  assert.ok(validation.indexOf(trustedRefStep) < validation.indexOf(validationCheckout), 'The dispatch ref must be checked before checkout')
  assert.match(validationCheckout, /ref: \$\{\{ github\.sha \}\}/, 'Validation must use the immutable trusted publication source')
  assert.match(
    validation,
    /run: node scripts\/verify\/release-candidate\.mjs/,
    'Publication must validate the candidate workflow and artifact metadata',
  )
  assert.match(
    validationDownload,
    /artifact-ids: \$\{\{ steps\.candidate\.outputs\.artifact_id \}\}/,
    'Candidate download must use the validated immutable artifact ID',
  )
  assert.match(
    validationDownload,
    /run-id: \$\{\{ steps\.candidate\.outputs\.run_id \}\}/,
    'Candidate download must use the validated workflow run',
  )
  assert.match(validationDownload, /github-token: \$\{\{ github\.token \}\}/, 'Cross-run download must use the read-only job token')
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
  const reviews = workflowSteps(validation).filter(step => step.includes('run: node scripts/verify/release-browser-review.mjs'))
  assert.equal(reviews.length, 1, 'Publication must require candidate-specific browser review')
  const review = reviews[0]
  assert.doesNotMatch(review, /(?:continue-on-error|if):/, 'Browser review cannot be bypassed')
  for (const [variable, expression] of [
    ['CANDIDATE_ARTIFACT_ID', 'steps.candidate.outputs.artifact_id'],
    ['REVIEWED_ARTIFACT_ID', 'inputs.reviewed_artifact_id'],
    ['BROWSER_REVIEW_URL', 'inputs.browser_review_url'],
    ['BROWSER_REVIEW_CONFIRMED', 'inputs.browser_review_confirmed'],
  ]) {
    assert.ok(review.includes(`${variable}: \${{ ${expression} }}`), `Review must use ${expression}`)
  }
  assert.ok(
    validation.indexOf(review) > validation.indexOf(validationDownload) &&
      validation.indexOf(review) < validation.indexOf('      - name: Forward the exact proven assets'),
    'Review must gate forwarding of the validated candidate',
  )
  assert.doesNotMatch(publish, /ref: v\$\{\{ inputs\.version \}\}/, 'Publishing code cannot be checked out from a mutable tag')
  for (const [name, environment] of [
    ['publish-chrome', 'chrome-web-store'],
    ['publish-firefox', 'firefox-add-ons'],
  ]) {
    const job = workflowJob(publish, name)
    const checkout = requireActionStep(job, 'actions/checkout', name)
    const download = requireActionStep(job, 'actions/download-artifact', name)
    assert.match(checkout, /ref: \$\{\{ needs\.validate-candidate\.outputs\.commit \}\}/, `${name} must use the validated source commit`)
    assert.match(
      download,
      /artifact-ids: \$\{\{ needs\.validate-candidate\.outputs\.artifact_id \}\}/,
      `${name} must download the validated immutable artifact`,
    )
    assert.match(job, new RegExp(`^    environment: ${environment}$`, 'm'), `${name} must use its protected environment`)
  }
  for (const workflow of [candidate, publish]) {
    for (const step of workflow.split(/(?=^ {6}- )/m).filter(step => step.includes('uses: actions/download-artifact@'))) {
      assert.match(step, /digest-mismatch: error/, 'Every release artifact download must fail on a digest mismatch')
    }
  }
  assert.doesNotMatch(publish, /\byarn (?:build|zip)/, 'Publication must never rebuild proven artifacts')
  const promotion = workflowJob(publish, 'publish-github-release')
  assert.match(
    promotion,
    /needs: \[validate-candidate, publish-chrome, publish-firefox\]/,
    'The public GitHub release must wait for both stores and use the validated artifact',
  )
  assert.match(
    requireActionStep(promotion, 'actions/download-artifact', 'Public release promotion'),
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
