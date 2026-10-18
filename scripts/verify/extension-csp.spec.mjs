import { describe, expect, it } from 'vitest'
import { hasExpectedExtensionCsp } from './extension-csp.mjs'

const expected = "script-src 'self'; object-src 'none'; frame-ancestors 'self' https://www.youtube.com;"
const manifest = (version, policy) => ({
  manifest_version: version,
  content_security_policy: version === 2 ? policy : { extension_pages: policy },
})

describe.each([2, 3])('packaged extension CSP for MV%s', version => {
  it('permits only packaged scripts and the exact trusted ancestors', () => {
    expect(hasExpectedExtensionCsp(manifest(version, expected))).toBe(true)
    expect(hasExpectedExtensionCsp(manifest(version, "frame-ancestors https://www.youtube.com 'self'; script-src 'self'; object-src 'none'")))
      .toBe(true)
  })

  it.each([
    "script-src 'self'; object-src 'none'",
    "script-src 'self'; object-src 'none'; frame-ancestors *",
    "script-src 'self'; object-src 'none'; frame-ancestors 'self' https://*.youtube.com",
    "script-src 'self'; object-src 'none'; frame-ancestors 'self' https://www.youtube.com https://attacker.example",
    "script-src 'self'; object-src 'none'; frame-ancestors 'self' http://www.youtube.com",
    "script-src 'self' 'unsafe-eval'; object-src 'none'; frame-ancestors 'self' https://www.youtube.com",
    `${expected} frame-ancestors *`,
  ])('rejects a missing or widened security boundary: %s', policy => {
    expect(hasExpectedExtensionCsp(manifest(version, policy))).toBe(false)
  })

  it('rejects a missing policy or the other manifest version CSP shape', () => {
    expect(hasExpectedExtensionCsp({ manifest_version: version })).toBe(false)
    expect(hasExpectedExtensionCsp({ ...manifest(version === 2 ? 3 : 2, expected), manifest_version: version })).toBe(false)
  })
})
