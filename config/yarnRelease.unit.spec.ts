import { describe, expect, it } from 'vitest'
import { validateYarnRelease, yarnReleasePath } from './yarnRelease'

describe('bundled Yarn release', () => {
  it('derives the release path from a pinned version', () => {
    expect(yarnReleasePath('yarn@4.19.0')).toBe('.yarn/releases/yarn-4.19.0.cjs')
    expect(validateYarnRelease('yarn@4.19.0', 'nodeLinker: node-modules\nyarnPath: .yarn/releases/yarn-4.19.0.cjs\n')).toBe(
      '.yarn/releases/yarn-4.19.0.cjs',
    )
  })

  it.each(['".yarn/releases/yarn-4.18.1.cjs"', "'.yarn/releases/yarn-4.18.1.cjs'"])('accepts a quoted YAML path %s', path => {
    expect(validateYarnRelease('yarn@4.18.1', `yarnPath: ${path} # pinned\n`)).toBe('.yarn/releases/yarn-4.18.1.cjs')
  })

  it.each([null, '', 'npm@4.18.1', 'yarn@latest', 'yarn@4.18', 'yarn@4.18.1/../../other', 'yarn@04.18.1'])('rejects %s', value => {
    expect(() => yarnReleasePath(value)).toThrow('packageManager must pin Yarn')
  })

  it.each(['', 'yarnPath: .yarn/releases/yarn-4.19.0.cjs', 'yarnPath: .yarn/releases/yarn-4.18.1.cjs\nyarnPath: another file'])(
    'rejects missing, different, or duplicate yarnPath',
    yarnrc => {
      expect(() => validateYarnRelease('yarn@4.18.1', yarnrc)).toThrow('.yarnrc.yml yarnPath must be .yarn/releases/yarn-4.18.1.cjs')
    },
  )
})
