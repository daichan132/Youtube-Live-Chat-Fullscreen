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
  { code: 'de', summary: 'Chat weg im Vollbild? Lies jede Nachricht und sende Super Chats.' },
  { code: 'ru', summary: 'Оверлей возвращает чат поверх видео: читайте сообщения, смотрите Super Chat.' },
  { code: 'id', summary: 'Overlay live chat YouTube di atas video: baca pesan, kirim Super Chat.' },
]

/**
 * The other half of the defect: the summary keeps a posting verb but hangs it on the
 * comment section under the video, a surface the overlay never reaches. Every one of
 * these shipped once. They must not satisfy the table either.
 */
const WRONG_SURFACE = [
  { code: 'en', summary: "A live chat overlay keeps YouTube's chat on the video: drag, resize, post comments and Super Chats." },
  { code: 'de', summary: 'Die Erweiterung legt YouTubes Livechat aufs Video – lies mit, kommentiere und sende Super Chats.' },
  { code: 'id', summary: 'Overlay yang menahan live chat YouTube di atas video: baca komentar, kirim Super Chat.' },
  { code: 'tr', summary: 'YouTube canlı sohbetini videonun üzerinde tutan kaplama: yorum yazın, Super Chat gönderin.' },
  { code: 'vi', summary: 'Lớp phủ giữ chat trực tiếp YouTube ngay trên video: đọc và viết bình luận, gửi Super Chat.' },
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

  it.each(WRONG_SURFACE)('rejects $code posting to the comment section instead of live chat', ({ code, summary }) => {
    expect(satisfies(code, summary)).toBe(false)
  })

  it('rejects a summary that drops the comment capability entirely', () => {
    expect(satisfies('en', 'Chat vanishes in full screen? Drag, resize and send Super Chats.')).toBe(false)
  })

  it('rejects a summary that drops Super Chat', () => {
    expect(satisfies('en', 'Chat vanishes in full screen? Post comments over the video.')).toBe(false)
  })
})
