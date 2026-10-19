#!/usr/bin/env node
import assert from 'node:assert/strict'
import { realpathSync } from 'node:fs'
import { appendFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

// This checks an explicit maintainer attestation, not the contents of the linked QA record.
export const validateBrowserReview = ({ artifactId, reviewedArtifactId, reviewUrl, confirmed }) => {
  assert.match(artifactId ?? '', /^[1-9]\d*$/, 'Candidate artifact ID must be valid')
  assert.equal(reviewedArtifactId, artifactId, 'Browser review must cover this exact candidate artifact and attempt')
  assert.equal(confirmed, 'true', 'Chrome and Firefox candidate review must be explicitly confirmed')
  const url = new URL(reviewUrl)
  assert.ok(url.protocol === 'https:' && !url.username && !url.password, 'QA record must be an HTTPS URL without credentials')
  return { artifactId, reviewUrl: url.href }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const review = validateBrowserReview({
    artifactId: process.env.CANDIDATE_ARTIFACT_ID,
    reviewedArtifactId: process.env.REVIEWED_ARTIFACT_ID,
    reviewUrl: process.env.BROWSER_REVIEW_URL,
    confirmed: process.env.BROWSER_REVIEW_CONFIRMED,
  })
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `\n## Maintainer browser review attestation\n\nCandidate artifact: ${review.artifactId}\n\nQA record: <${review.reviewUrl}>\n\nChrome and Firefox review explicitly confirmed by workflow dispatcher. Record contents are not automatically verified.\n`,
    )
  }
}
