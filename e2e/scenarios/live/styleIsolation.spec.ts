import { getE2ETestTargets } from '@e2e/config/testTargets'
import { expect, test } from '@e2e/fixtures'
import { YouTubeWatchPage } from '@e2e/pages/YouTubeWatchPage'

type StyleIsolationAudit = {
  hasShadowRoot: boolean
  shadowHasContentCssLink: boolean
  documentHasContentCssLink: boolean
  documentThemeStyleTagCount: number
  documentThemeSelectorCount: number
  leakedRootVariableValue: string
}

const auditStyleIsolation = (): StyleIsolationAudit => {
  const host = document.getElementById('shadow-root-live-chat')
  const shadowRoot = host?.shadowRoot ?? null
  const themeSelectorPattern = /(?:\.ylc-theme-|\.ylc-setting-panel|\.ylc-preset-card|\.ylc-add-preset-button)/
  const themeStyleTags = Array.from(document.head.querySelectorAll('style')).filter(style => {
    const text = style.textContent ?? ''
    return (
      text.includes('.ylc-theme-') ||
      text.includes('.ylc-setting-panel') ||
      text.includes('.ylc-preset-card') ||
      text.includes('.ylc-add-preset-button') ||
      text.includes('--ylc-')
    )
  })

  let documentThemeSelectorCount = 0
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null = null
    try {
      rules = sheet.cssRules
    } catch {
      rules = null
    }
    if (!rules) continue

    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSStyleRule)) continue
      if (themeSelectorPattern.test(rule.selectorText)) {
        documentThemeSelectorCount += 1
      }
    }
  }

  return {
    hasShadowRoot: Boolean(shadowRoot),
    shadowHasContentCssLink: Boolean(shadowRoot?.querySelector('link[href*="content-scripts/content.css"]')),
    documentHasContentCssLink: Boolean(document.head.querySelector('link[href*="content-scripts/content.css"]')),
    documentThemeStyleTagCount: themeStyleTags.length,
    documentThemeSelectorCount,
    leakedRootVariableValue: getComputedStyle(document.documentElement).getPropertyValue('--ylc-bg-surface').trim(),
  }
}

test.describe('style isolation', { tag: '@live' }, () => {
  test('content ui theme styles stay isolated from document stylesheets', async ({ page }) => {
    test.setTimeout(120000)

    const targetUrl = getE2ETestTargets().noChat.url
    const yt = new YouTubeWatchPage(page)

    await yt.goto(targetUrl)

    const fullscreenReady = await page
      .locator('button.ytp-fullscreen-button')
      .waitFor({ state: 'visible', timeout: 10000 })
      .then(
        () => true,
        () => false,
      )
    if (!fullscreenReady) {
      test.skip(true, 'Fullscreen button did not appear.')
      return
    }

    await yt.enterFullscreen()

    const shadowReady = await page
      .waitForFunction(() => Boolean(document.getElementById('shadow-root-live-chat')?.shadowRoot), { timeout: 15000 })
      .then(
        () => true,
        () => false,
      )
    if (!shadowReady) {
      test.skip(true, 'Extension shadow root was not mounted in fullscreen.')
      return
    }

    const audit = await page.evaluate(auditStyleIsolation)

    expect(audit.hasShadowRoot).toBe(true)
    expect(audit.shadowHasContentCssLink).toBe(true)
    expect(audit.documentHasContentCssLink).toBe(false)
    expect(audit.documentThemeStyleTagCount).toBe(0)
    expect(audit.documentThemeSelectorCount).toBe(0)
    expect(audit.leakedRootVariableValue).toBe('')
  })
})
