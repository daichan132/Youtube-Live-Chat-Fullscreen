// Keep this package assertion independent of the authored manifest policy: an
// accidental widening must fail even when the shared config is changed too.
const expectedDirectives = {
  'script-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'self'", 'https://www.youtube.com'],
}

export const hasExpectedExtensionCsp = manifest => {
  const policy = manifest.manifest_version === 2
    ? manifest.content_security_policy
    : manifest.content_security_policy?.extension_pages
  if (typeof policy !== 'string') return false
  const directives = new Map()
  for (const directive of policy.split(';').map(value => value.trim()).filter(Boolean)) {
    const [name, ...sources] = directive.split(/\s+/)
    if (directives.has(name)) return false
    directives.set(name, sources.sort())
  }
  return directives.size === Object.keys(expectedDirectives).length && Object.entries(expectedDirectives).every(
    ([name, expectedSources]) => JSON.stringify(directives.get(name)) === JSON.stringify([...expectedSources].sort()),
  )
}
