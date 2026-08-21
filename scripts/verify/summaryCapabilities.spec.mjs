import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SUMMARY_CAPABILITIES } from './summaryCapabilities.mjs'

const assetsDir = fileURLToPath(new URL('../../shared/i18n/assets/', import.meta.url))
const localeCodes = readdirSync(assetsDir)
  .filter(name => name.endsWith('.json'))
  .map(name => name.slice(0, -'.json'.length))
  .sort()
const summaryOf = code => JSON.parse(readFileSync(`${assetsDir}${code}.json`, 'utf8')).extensionDescription

/**
 * Rewrites a native reader would call a loss of the posting capability. Each one passed
 * an earlier version of this table, because the table tested for a noun while claiming to
 * test for the action. They stay here so that regression cannot return unnoticed.
 */
const DEMOTIONS = [
  { code: 'en', summary: 'Read comments and send Super Chats.' },
  { code: 'en_US', summary: 'Read comments and send Super Chats.' },
  { code: 'en_GB', summary: 'Read comments and send Super Chats.' },
  { code: 'en_AU', summary: 'Read comments and send Super Chats.' },
  { code: 'sw', summary: 'Ovelei ya gumzo la YouTube juu ya video: soma tu, tuma Super Chat.' },
]

const satisfies = (code, summary) => SUMMARY_CAPABILITIES[code].every(pattern => pattern.test(summary))

describe('store summary capability patterns', () => {
  it('covers every shipped locale', () => {
    expect(Object.keys(SUMMARY_CAPABILITIES).sort()).toEqual(localeCodes)
  })

  it.each(localeCodes)('accepts the summary %s actually ships', code => {
    expect(satisfies(code, summaryOf(code))).toBe(true)
  })

  it.each(DEMOTIONS)('rejects $code demoted from posting to reading', ({ code, summary }) => {
    expect(satisfies(code, summary)).toBe(false)
  })

  it('rejects a summary that drops the comment capability entirely', () => {
    expect(satisfies('en', 'Chat vanishes in full screen? Drag, resize and send Super Chats.')).toBe(false)
  })

  it('rejects a summary that drops Super Chat', () => {
    expect(satisfies('en', 'Chat vanishes in full screen? Post comments over the video.')).toBe(false)
  })
})
