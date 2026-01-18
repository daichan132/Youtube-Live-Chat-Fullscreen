import type { Page } from '@playwright/test'

const liveSearchUrl = 'https://www.youtube.com/results?search_query=vtuber&sp=EgJAAQ%253D%253D'

const consentSelectors = [
  'button:has-text("I agree")',
  'button:has-text("Accept all")',
  'button:has-text("Accept the use of cookies")',
  'button:has-text("同意する")',
  'button:has-text("すべて同意")',
]

export const acceptYouTubeConsent = async (page: Page) => {
  for (const selector of consentSelectors) {
    const button = page.locator(selector).first()
    if (await button.isVisible({ timeout: 1500 }).catch(() => false)) {
      await button.click()
      return
    }
  }
}

const collectLiveUrls = () => {
  const anchors = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      'ytd-rich-item-renderer a#thumbnail, ytd-video-renderer a#thumbnail, ytd-grid-video-renderer a#thumbnail',
    ),
  )
  const urls = anchors
    .map(anchor => anchor.getAttribute('href'))
    .filter(Boolean)
    .map(href => new URL(href as string, location.origin).toString())

  return Array.from(new Set(urls))
}

const hasChatFrame = () => {
  const liveChatFrame = document.querySelector('ytd-live-chat-frame')
  const chatFrame = document.querySelector('#chatframe')
  return Boolean(liveChatFrame && chatFrame)
}

export const findLiveUrlWithChat = async (page: Page, limit = 8, searchUrl = liveSearchUrl) => {
  await page.context().addCookies([
    { name: 'CONSENT', value: 'YES+1', domain: '.youtube.com', path: '/', secure: true, sameSite: 'Lax' },
    { name: 'CONSENT', value: 'YES+1', domain: '.google.com', path: '/', secure: true, sameSite: 'Lax' },
  ])

  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await acceptYouTubeConsent(page)
  if (page.url().includes('consent')) {
    await page.waitForTimeout(1500)
    await acceptYouTubeConsent(page)
  }

  await page.waitForFunction(() => document.querySelectorAll('a#thumbnail').length > 0, { timeout: 45000 })
  const urls = await page.evaluate(collectLiveUrls)
  const candidates = urls.slice(0, limit)

  for (const url of candidates) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await acceptYouTubeConsent(page)
    const hasChat = await page.waitForFunction(hasChatFrame, { timeout: 15000 }).then(
      () => true,
      () => false,
    )
    if (hasChat) return url
  }

  throw new Error('No live video with chat found from search.')
}
