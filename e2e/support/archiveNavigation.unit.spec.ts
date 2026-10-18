import { errors, type Page } from '@playwright/test'
import { describe, expect, it } from 'vitest'
import { openArchiveWatchPage } from './diagnostics'

const watchUrl = 'https://www.youtube.com/watch?v=archive-fixture'
const stages = ['navigation', 'consent', 'player', 'native-frame'] as const
type Stage = (typeof stages)[number]

const createPage = (fault?: { stage: Stage; error: Error }) => {
  let currentUrl = 'about:blank'
  const failIf = (stage: Stage) => {
    if (fault?.stage === stage) throw fault.error
  }
  const page = {
    goto: async (url: string) => {
      failIf('navigation')
      currentUrl = url
    },
    url: () => currentUrl,
    locator: () => ({
      first: () => ({
        isVisible: async () => {
          return fault?.stage === 'consent'
        },
        click: async () => failIf('consent'),
      }),
    }),
    waitForSelector: async (selector: string) => {
      const stage = selector === '#movie_player' ? 'player' : 'native-frame'
      failIf(stage)
      return { selector }
    },
  } as unknown as Page
  return { page, currentUrl: () => currentUrl }
}

describe('archive watch navigation preconditions', () => {
  it('accepts the navigated page when both YouTube surfaces are ready', async () => {
    const browser = createPage()

    expect(await openArchiveWatchPage(browser.page, watchUrl)).toBe(true)

    expect(browser.currentUrl()).toBe(watchUrl)
  })

  it.each(stages)('reports a timed-out %s precondition as unavailable', async stage => {
    const browser = createPage({ stage, error: new errors.TimeoutError('YouTube UI was unavailable') })

    expect(await openArchiveWatchPage(browser.page, watchUrl)).toBe(false)
  })

  it.each([
    { stage: 'navigation' as const, error: new Error('Browser connection closed') },
    { stage: 'consent' as const, error: new TypeError('Broken consent helper') },
    { stage: 'player' as const, error: new TypeError('Broken player locator') },
    { stage: 'native-frame' as const, error: new Error('Target page has been closed') },
  ])('propagates the original error at $stage', async ({ stage, error }) => {
    const browser = createPage({ stage, error })

    await expect(openArchiveWatchPage(browser.page, watchUrl)).rejects.toBe(error)
  })
})
