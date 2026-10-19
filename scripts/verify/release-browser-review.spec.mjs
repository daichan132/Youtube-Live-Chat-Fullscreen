import { describe, expect, it } from 'vitest'
import { validateBrowserReview } from './release-browser-review.mjs'

const review = {
  artifactId: '12345',
  reviewedArtifactId: '12345',
  reviewUrl: 'https://github.com/example/project/issues/1',
  confirmed: 'true',
}

describe('candidate browser review attestation', () => {
  it('accepts explicit review of the exact immutable artifact', () => {
    expect(validateBrowserReview(review).artifactId).toBe('12345')
  })

  it.each([
    { reviewedArtifactId: '12344' },
    { reviewedArtifactId: undefined },
    { artifactId: '' },
    { confirmed: 'false' },
    { confirmed: undefined },
    { reviewUrl: '' },
    { reviewUrl: 'http://example.com/qa' },
    { reviewUrl: 'https://user:secret@example.com/qa' },
  ])('rejects missing, stale or unconfirmed review: %j', change => {
    expect(() => validateBrowserReview({ ...review, ...change })).toThrow()
  })
})
