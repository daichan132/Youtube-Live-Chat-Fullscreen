/** Resolve the pinned, repository-bundled Yarn without accepting arbitrary paths. */
export const yarnReleasePath = (packageManager: unknown): string => {
  if (typeof packageManager !== 'string' || !/^yarn@(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(packageManager)) {
    throw new Error('packageManager must pin Yarn to a numeric major.minor.patch version')
  }
  return `.yarn/releases/yarn-${packageManager.slice('yarn@'.length)}.cjs`
}

/** The source archive must use the same pinned release through Yarn's config. */
export const validateYarnRelease = (packageManager: unknown, yarnrc: string): string => {
  const expected = yarnReleasePath(packageManager)
  const entries = yarnrc.split(/\r?\n/).filter(line => /^yarnPath\s*:/.test(line))
  const match = entries[0]?.match(/^yarnPath\s*:\s*(?:"([^"]*)"|'([^']*)'|([^\s#]+))\s*(?:#.*)?$/)
  const value = match?.[1] ?? match?.[2] ?? match?.[3]
  if (entries.length !== 1 || value !== expected) throw new Error(`.yarnrc.yml yarnPath must be ${expected}`)
  return expected
}
