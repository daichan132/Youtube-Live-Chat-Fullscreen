import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { Page } from '@playwright/test'
import type { ChatGeometryV2 } from '../../../shared/settings/model'

const scenarioState = {
  video: { id: 'ylc-chat-only-spacing', title: 'Messages-only edge spacing fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'live', native: { state: 'absent' }, response: 'playable' },
} satisfies YouTubeScenarioState

const geometry: ChatGeometryV2 = {
  reference: 'player',
  rect: { x: 100 / 1280, y: 80 / 720, width: 400 / 1280, height: 400 / 720 },
  pinned: true,
}

type NativeLayout = 'direct' | 'nested'
type NativeChrome = 'live' | 'replay-header' | 'replay-headerless'

const installNativeLayoutProbe = (page: Page, layout: NativeLayout, chrome: NativeChrome = 'live') =>
  page
    .frameLocator('iframe[data-ylc-chat]')
    .locator('body')
    .evaluate((body, { nativeLayout, nativeChrome }) => {
      const document = body.ownerDocument
      const style = document.createElement('style')
      // Keep the extension's injected head styles. This models native flex
      // layout without supplying the edge padding that the product must add.
      style.textContent = `
        html, body { height: 100%; margin: 0; overflow: hidden; }
        #spacing-probe { display: flex; flex-direction: column; width: 100%; height: 100%; padding: 0; }
        #spacing-probe[data-layout="direct"] { display: block; }
        #spacing-probe > #contents { display: flex; flex-direction: column; height: 100%; padding: 0; }
        #spacing-probe [data-native-flex] { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 0; }
        #spacing-probe [data-outer-contents] { position: relative; overflow: hidden; }
        #spacing-probe #chat { position: relative; }
        #spacing-probe yt-live-chat-header-renderer { display: block; flex: none; height: 56px; }
        #spacing-probe #ticker { display: block; flex: none; }
        #spacing-probe yt-live-chat-ticker-renderer { display: block; height: 32px; line-height: 32px; }
        #spacing-probe yt-live-chat-item-list-renderer {
          display: flex; flex-direction: column; position: relative; overflow: hidden; flex: 1; min-height: 0;
        }
        #spacing-probe [data-list-contents] { display: flex; flex-direction: column; position: absolute; inset: 0; padding: 0; }
        #spacing-probe #item-scroller { flex: 1; min-height: 0; overflow-y: scroll; overflow-anchor: none; padding: 0; }
        #spacing-probe #items { display: flex; flex-direction: column; padding: 0; }
        #spacing-probe yt-live-chat-text-message-renderer {
          display: block; flex: none; box-sizing: border-box; height: 24px; line-height: 24px; padding: 0 10px;
        }
        #spacing-probe #input-panel { display: block; flex: none; height: 64px; }
        #spacing-probe yt-live-chat-message-input-renderer { display: block; height: 100%; }
        #spacing-probe [data-native-footer] { flex: none; height: 60px; line-height: 20px; }
        #spacing-probe #show-more { position: absolute; bottom: 0; background: #065fd4; width: 32px; height: 32px; }
        #spacing-probe [hidden] { display: none !important; }
      `
      document.head.append(style)
      const messages = `<div id="item-scroller" class="yt-live-chat-item-list-renderer"><div id="items">
        ${Array.from({ length: 30 }, (_, index) => `<yt-live-chat-text-message-renderer>Viewer ${index + 1}: Fixture chat message ${index + 1}</yt-live-chat-text-message-renderer>`).join('')}
        </div></div><button id="show-more" style="visibility: hidden" aria-label="Jump to latest">↓</button><div data-native-footer hidden>Native pinned message<br>Retained outside the message scroller</div>`
      const list = `<yt-live-chat-item-list-renderer>${
        nativeLayout === 'nested' ? `<div id="contents" data-list-contents>${messages}</div>` : messages
      }</yt-live-chat-item-list-renderer>`
      const header = `${nativeChrome === 'replay-headerless' ? '' : '<yt-live-chat-header-renderer>Live chat</yt-live-chat-header-renderer>'}
        <div id="ticker"><yt-live-chat-ticker-renderer>Fixture Super Chat ticker</yt-live-chat-ticker-renderer></div>`
      const input =
        nativeChrome === 'live'
          ? '<div id="input-panel"><yt-live-chat-message-input-renderer>Send a message</yt-live-chat-message-input-renderer></div>'
          : ''
      // The modern native tree has no direct renderer > #contents child. Its
      // list has a second #contents with absolute positioning and its own scroll.
      const contents =
        nativeLayout === 'nested'
          ? `<tp-yt-iron-pages id="content-pages" data-native-flow data-native-flex>
              <div id="chat-messages" data-native-flex><div id="contents" data-outer-contents data-native-flex>
                ${header}<div id="chat" data-native-flex><div data-native-flex>${list}</div>${input}</div>
              </div></div>
            </tp-yt-iron-pages>`
          : `<div id="contents" data-native-flow>${header}${list}${input}</div>`
      body.innerHTML = `<yt-live-chat-renderer id="spacing-probe" data-layout="${nativeLayout}">${contents}</yt-live-chat-renderer>`
      const scroller = document.getElementById('item-scroller')
      const items = document.getElementById('items')
      if (!scroller || !items) throw new Error('Native scrolling probe is incomplete.')
      const jump = document.getElementById('show-more')
      const view = document.defaultView
      if (!jump || !view) throw new Error('Native jump control is missing.')
      const updateJump = () => { jump.style.visibility = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 2 ? 'visible' : 'hidden' }
      let settle = 0
      // Native resize detection can reveal the button before extension scroll
      // compensation; its asynchronous follow-state update hides it later.
      new view.ResizeObserver(() => {
        if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 2) {
          jump.style.visibility = 'visible'
          view.clearTimeout(settle)
          settle = view.setTimeout(updateJump, 150)
        }
      }).observe(scroller)
      scroller.addEventListener('scroll', () => {
        view.clearTimeout(settle)
        settle = view.setTimeout(updateJump, 150)
      })
      jump.addEventListener('click', () => { scroller.scrollTop = scroller.scrollHeight })
      // The native-like new-message handler follows only a bottom reader.
      // Hover compensation must not take over ordinary arrival or manual input.
      const MutationObserver = document.defaultView?.MutationObserver
      if (!MutationObserver) throw new Error('The chat document has no MutationObserver.')
      let previousHeight = scroller.scrollHeight
      new MutationObserver(() => {
        const following = previousHeight - scroller.clientHeight - scroller.scrollTop <= 2
        previousHeight = scroller.scrollHeight
        if (following) scroller.scrollTop = scroller.scrollHeight
      }).observe(items, { childList: true })
    }, { nativeLayout: layout, nativeChrome: chrome })

const readLayout = (page: Page) =>
  page
    .frameLocator('iframe[data-ylc-chat]')
    .locator('body')
    .evaluate(body => {
      const document = body.ownerDocument
      const get = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector)
        if (!element) throw new Error(`Missing spacing probe element: ${selector}`)
        return element
      }
      const renderer = get('#spacing-probe').getBoundingClientRect()
      const flow = get('[data-native-flow]').getBoundingClientRect()
      const scroller = get('#item-scroller')
      const bounds = scroller.getBoundingClientRect()
      const rows = [...get('#items').children]
      const first = rows[0]?.getBoundingClientRect()
      const second = rows[1]?.getBoundingClientRect()
      const view = document.defaultView
      if (!first || !second || !view) throw new Error('Spacing probe needs at least two rendered rows.')
      return {
        collapsed: body.classList.contains('chat-only-display'),
        flowHeight: flow.height,
        flowTopInset: flow.top - renderer.top,
        flowBottomInset: renderer.bottom - flow.bottom,
        internalContentsUnpadded: [...document.querySelectorAll('#spacing-probe #contents')].every(element => {
          const style = view.getComputedStyle(element)
          return style.paddingTop === '0px' && style.paddingBottom === '0px'
        }),
        topInset: bounds.top - renderer.top,
        bottomInset: renderer.bottom - bounds.bottom,
        scrollerHeight: bounds.height,
        scrollerPaddingTop: view.getComputedStyle(scroller).paddingTop,
        scrollerPaddingBottom: view.getComputedStyle(scroller).paddingBottom,
        headerHeight: document.querySelector('yt-live-chat-header-renderer')?.getBoundingClientRect().height ?? 0,
        inputHeight: document.querySelector('#input-panel')?.getBoundingClientRect().height ?? 0,
        inputCount: document.querySelectorAll('#input-panel, yt-live-chat-message-input-renderer').length,
        tickerTop: get('yt-live-chat-ticker-renderer').getBoundingClientRect().top - renderer.top,
        tickerHeight: get('yt-live-chat-ticker-renderer').getBoundingClientRect().height,
        footerHeight: get('[data-native-footer]').getBoundingClientRect().height,
        rowHeight: first.height,
        rowGap: second.top - first.bottom,
        rowPitch: second.top - first.top,
        rowCount: rows.length,
        scrollTop: scroller.scrollTop,
        scrollBottom: scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop,
      }
    })

type TransitionSample = {
  iframeWidth: number
  iframeHeight: number
  viewportWidth: number
  viewportHeight: number
  rendererWidth: number
  rendererHeight: number
  flowTopInset: number
  flowBottomInset: number
  scrollerWidth: number
  scrollerHeight: number
  headerHeight: number
  inputHeight: number
}

type SamplingWindow = Window & {
  __ylcSpacingRecorder?: { samples: TransitionSample[]; frame: number; read: () => TransitionSample }
}

const readScrollAnchor = (page: Page) =>
  page.frameLocator('iframe[data-ylc-chat]').locator('#item-scroller').evaluate(scroller => {
    const anchor = scroller.querySelector('#items')?.children[15]
    if (!anchor) throw new Error('Missing reading anchor')
    return {
      y: anchor.getBoundingClientRect().top,
      bottom: scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop,
      scrollTop: scroller.scrollTop,
    }
  })

const startSampling = (page: Page) =>
  page.frameLocator('iframe[data-ylc-chat]').locator('body').evaluate(body => {
    const document = body.ownerDocument
    const view = document.defaultView as SamplingWindow | null
    const renderer = document.querySelector('#spacing-probe')
    const flow = document.querySelector('[data-native-flow]')
    const scroller = document.querySelector('#item-scroller')
    const header = document.querySelector('yt-live-chat-header-renderer')
    const input = document.querySelector('#input-panel')
    const iframe = view?.frameElement
    if (!view || !renderer || !flow || !scroller || !iframe) throw new Error('Replay animation probe is incomplete.')
    const read = (): TransitionSample => {
      const frameBounds = iframe.getBoundingClientRect()
      const rendererBounds = renderer.getBoundingClientRect()
      const flowBounds = flow.getBoundingClientRect()
      const scrollerBounds = scroller.getBoundingClientRect()
      return {
        iframeWidth: frameBounds.width,
        iframeHeight: frameBounds.height,
        viewportWidth: view.innerWidth,
        viewportHeight: view.innerHeight,
        rendererWidth: rendererBounds.width,
        rendererHeight: rendererBounds.height,
        flowTopInset: flowBounds.top - rendererBounds.top,
        flowBottomInset: rendererBounds.bottom - flowBounds.bottom,
        scrollerWidth: scrollerBounds.width,
        scrollerHeight: scrollerBounds.height,
        headerHeight: header?.getBoundingClientRect().height ?? 0,
        inputHeight: input?.getBoundingClientRect().height ?? 0,
      }
    }
    const recorder = { samples: [read()], frame: 0, read }
    const sampleFrame = () => {
      recorder.samples.push(read())
      recorder.frame = view.requestAnimationFrame(sampleFrame)
    }
    view.__ylcSpacingRecorder = recorder
    recorder.frame = view.requestAnimationFrame(sampleFrame)
  })

const stopSampling = (page: Page) =>
  page.frameLocator('iframe[data-ylc-chat]').locator('body').evaluate(body => {
    const view = body.ownerDocument.defaultView as SamplingWindow | null
    const recorder = view?.__ylcSpacingRecorder
    if (!view || !recorder) return []
    view.cancelAnimationFrame(recorder.frame)
    recorder.samples.push(recorder.read())
    view.__ylcSpacingRecorder = undefined
    return recorder.samples
  })

const sampleHoverTransition = async (
  page: Page,
  action: () => Promise<unknown>,
  expected: { collapsed: boolean; headerHeight: number },
) => {
  let samples: TransitionSample[] = []
  await startSampling(page)
  try {
    await action()
    await expect.poll(() => readLayout(page)).toMatchObject(expected)
  } finally {
    samples = await stopSampling(page)
  }
  return samples
}

const expectSmoothEdgeFrames = (samples: TransitionSample[], header: boolean, input: boolean, intermediate: boolean) => {
  expect(samples.length).toBeGreaterThan(1)
  for (const sample of samples) {
    expect(sample).toMatchObject({
      iframeWidth: 400,
      iframeHeight: 400,
      viewportWidth: 400,
      viewportHeight: 400,
      rendererWidth: 400,
      rendererHeight: 400,
      scrollerWidth: 400,
    })
    expect(sample.flowTopInset).toBeGreaterThanOrEqual(0)
    expect(sample.flowTopInset).toBeLessThanOrEqual(12)
    expect(sample.flowBottomInset).toBeGreaterThanOrEqual(0)
    expect(sample.flowBottomInset).toBeLessThanOrEqual(12)
    if (!header) expect(sample.flowTopInset).toBe(12)
    if (!input) expect(sample.flowBottomInset).toBe(12)
    expect(sample.scrollerHeight + sample.headerHeight + sample.inputHeight + sample.flowTopInset + sample.flowBottomInset).toBeCloseTo(400, 1)
  }
  if (intermediate && header) {
    // Inspect actual browser frames: class changes and a declared duration do
    // not establish that the native header moved through intermediate heights.
    expect(samples.some(sample => sample.headerHeight > 0 && sample.headerHeight < 56)).toBe(true)
    expect(samples.some(sample => sample.flowTopInset > 0 && sample.flowTopInset < 12)).toBe(true)
  }
  if (intermediate && input) {
    expect(samples.some(sample => sample.inputHeight > 0 && sample.inputHeight < 64)).toBe(true)
    expect(samples.some(sample => sample.flowBottomInset > 0 && sample.flowBottomInset < 12)).toBe(true)
  }
}

test.describe('messages-only fixed edge spacing', { tag: ['@fixture', '@live'] }, () => {
  for (const layout of ['direct', 'nested'] as const) {
    for (const spacing of [0, 6]) {
      test(`keeps 12px outside ${layout} native scrolling without changing message spacing ${spacing}`, async ({ page, extension }, testInfo) => {
        await patchOverlayStore(extension, {
          geometry,
          profile: {
            appearance: { spacing, fontSize: 14, showSuperChatBar: false },
            display: { contentMode: 'full-chat', idleVisibility: 'always-visible' },
          },
        })
        const scenario = new YouTubeScenario(page)
        const overlay = new ExtensionOverlay(page)
        await scenario.load(scenarioState)
        await scenario.enterFullscreen()
        await overlay.expectChatLoaded({ timeout: 12000 })
        await installNativeLayoutProbe(page, layout)
        const rowMetrics = { rowHeight: 24, rowGap: spacing * 2, rowPitch: 24 + spacing * 2 }
        const fullChat = {
          collapsed: false,
          flowHeight: 400,
          flowTopInset: 0,
          flowBottomInset: 0,
          internalContentsUnpadded: true,
          topInset: 56,
          bottomInset: 64,
          scrollerHeight: 280,
          headerHeight: 56,
          inputHeight: 64,
          tickerHeight: 0,
          footerHeight: 0,
          ...rowMetrics,
        }
        await expect.poll(() => readLayout(page)).toMatchObject(fullChat)

        await page.mouse.move(1000, 600)
        await patchOverlayStore(extension, { profile: { display: { contentMode: 'messages-only' } } })
        const collapsed = {
          collapsed: true,
          flowHeight: 376,
          flowTopInset: 12,
          flowBottomInset: 12,
          internalContentsUnpadded: true,
          topInset: 12,
          bottomInset: 12,
          scrollerHeight: 376,
          scrollerPaddingTop: '0px',
          scrollerPaddingBottom: '0px',
          headerHeight: 0,
          inputHeight: 0,
          tickerHeight: 0,
          footerHeight: 0,
          ...rowMetrics,
        }
        await expect.poll(() => readLayout(page)).toMatchObject(collapsed)
        await testInfo.attach(`messages-only-${layout}-inset-spacing-${spacing}`, { body: await page.screenshot(), contentType: 'image/png' })

        const chat = page.frameLocator('iframe[data-ylc-chat]')
        await chat.locator('#item-scroller').evaluate(scroller => {
          scroller.scrollTop = 240
        })
        await expect.poll(() => readLayout(page)).toMatchObject({ ...collapsed, scrollTop: 240 })
        await chat.locator('#item-scroller').evaluate(scroller => {
          scroller.scrollTop = scroller.scrollHeight
        })
        await expect.poll(() => readLayout(page)).toMatchObject({ ...collapsed, scrollBottom: 0, rowCount: 30 })
        await chat.locator('#items').evaluate(items => {
          const row = items.ownerDocument.createElement('yt-live-chat-text-message-renderer')
          row.textContent = 'New viewer: A native message just arrived'
          items.append(row)
        })
        await expect.poll(() => readLayout(page)).toMatchObject({ ...collapsed, scrollBottom: 0, rowCount: 31 })

        const expansion = await sampleHoverTransition(
          page,
          () => overlay.frame().hover({ position: { x: 100, y: 100 } }),
          { collapsed: false, headerHeight: 56 },
        )
        expectSmoothEdgeFrames(expansion, true, true, true)
        await expect.poll(() => readLayout(page)).toMatchObject(fullChat)
        await testInfo.attach('expanded-no-extra-insets', { body: await page.screenshot(), contentType: 'image/png' })
        const collapse = await sampleHoverTransition(page, () => page.mouse.move(1000, 600), { collapsed: true, headerHeight: 0 })
        expectSmoothEdgeFrames(collapse, true, true, true)
        await expect.poll(() => readLayout(page)).toMatchObject(collapsed)

        await chat.locator('[data-native-footer]').evaluate(footer => {
          footer.removeAttribute('hidden')
        })
        await expect.poll(() => readLayout(page)).toMatchObject({ ...collapsed, bottomInset: 72, scrollerHeight: 316, footerHeight: 60 })
        await patchOverlayStore(extension, { profile: { appearance: { showSuperChatBar: true } } })
        await expect.poll(() => readLayout(page)).toMatchObject({
          ...collapsed,
          topInset: 44,
          bottomInset: 72,
          scrollerHeight: 284,
          tickerTop: 12,
          tickerHeight: 32,
          footerHeight: 60,
        })
        await testInfo.attach(`messages-only-${layout}-ticker-and-pinned-footer-spacing-${spacing}`, {
          body: await page.screenshot(),
          contentType: 'image/png',
        })

        await chat.locator('[data-native-footer]').evaluate(footer => {
          footer.setAttribute('hidden', '')
        })
        await patchOverlayStore(extension, {
          profile: { appearance: { showSuperChatBar: false }, display: { contentMode: 'full-chat' } },
        })
        await expect.poll(() => readLayout(page)).toMatchObject(fullChat)
      })
    }
  }
})

test.describe('replay messages-only hover without a composer', { tag: ['@fixture', '@archive'] }, () => {
  for (const variant of ['header', 'headerless', 'reduced-motion'] as const) {
    test(`preserves the viewport and animates only present edges through ${variant} replay hover`, async ({ page, extension }, testInfo) => {
      const hasHeader = variant !== 'headerless'
      await page.emulateMedia({ reducedMotion: variant === 'reduced-motion' ? 'reduce' : 'no-preference' })
      await patchOverlayStore(extension, {
        geometry,
        profile: {
          appearance: { spacing: 0, fontSize: 14, showSuperChatBar: false },
          display: { contentMode: 'messages-only', idleVisibility: 'always-visible' },
        },
      })
      const scenario = new YouTubeScenario(page)
      const overlay = new ExtensionOverlay(page)
      await scenario.load({
        ...scenarioState,
        video: { ...scenarioState.video, mode: 'archive' },
        chat: { mode: 'archive', native: { state: 'playable' }, response: 'playable' },
      })
      await scenario.enterFullscreen()
      await overlay.expectArchiveChatPlayable({ timeout: 12000 })
      await installNativeLayoutProbe(page, 'nested', hasHeader ? 'replay-header' : 'replay-headerless')
      await page.mouse.move(1000, 600)
      const collapsed = {
        collapsed: true,
        flowHeight: 376,
        flowTopInset: 12,
        flowBottomInset: 12,
        internalContentsUnpadded: true,
        topInset: 12,
        bottomInset: 12,
        scrollerHeight: 376,
        headerHeight: 0,
        inputHeight: 0,
        inputCount: 0,
        rowHeight: 24,
        rowGap: 0,
        rowPitch: 24,
      }
      await expect.poll(() => readLayout(page)).toMatchObject(collapsed)
      const chat = page.frameLocator('iframe[data-ylc-chat]')
      await expect(chat.locator('#spacing-probe')).toHaveCSS('transition-duration', variant === 'reduced-motion' ? '0.001s' : '0.26s')
      await expect(chat.locator('yt-live-chat-header-renderer')).toHaveCount(hasHeader ? 1 : 0)
      await expect(chat.locator('yt-live-chat-restricted-participation-renderer, yt-live-chat-sign-in-prompt-renderer')).toHaveCount(0)
      await testInfo.attach(`replay-${variant}-collapsed`, { body: await page.screenshot(), contentType: 'image/png' })

      const expanded = {
        ...collapsed,
        collapsed: false,
        flowHeight: hasHeader ? 388 : 376,
        flowTopInset: hasHeader ? 0 : 12,
        headerHeight: hasHeader ? 56 : 0,
        topInset: hasHeader ? 56 : 12,
        scrollerHeight: hasHeader ? 332 : 376,
      }
      const expansion = await sampleHoverTransition(
        page,
        () => overlay.frame().hover({ position: { x: 100, y: 100 } }),
        { collapsed: false, headerHeight: hasHeader ? 56 : 0 },
      )
      expectSmoothEdgeFrames(expansion, hasHeader, false, variant === 'header')
      await expect.poll(() => readLayout(page)).toMatchObject(expanded)
      await testInfo.attach(`replay-${variant}-expansion-frames`, { body: JSON.stringify(expansion), contentType: 'application/json' })
      await testInfo.attach(`replay-${variant}-expanded`, { body: await page.screenshot(), contentType: 'image/png' })

      const collapse = await sampleHoverTransition(
        page,
        () => page.mouse.move(1000, 600),
        { collapsed: true, headerHeight: 0 },
      )
      expectSmoothEdgeFrames(collapse, hasHeader, false, variant === 'header')
      await expect.poll(() => readLayout(page)).toMatchObject(collapsed)
      await testInfo.attach(`replay-${variant}-collapse-frames`, { body: JSON.stringify(collapse), contentType: 'application/json' })

      await patchOverlayStore(extension, { profile: { display: { contentMode: 'full-chat' } } })
      await expect.poll(() => readLayout(page)).toMatchObject({
        ...expanded,
        flowHeight: 400,
        flowTopInset: 0,
        flowBottomInset: 0,
        topInset: hasHeader ? 56 : 0,
        bottomInset: 0,
        scrollerHeight: hasHeader ? 344 : 400,
      })
    })
  }
})

test.describe('scroll position during chat chrome transitions', { tag: '@fixture' }, () => {
  for (const kind of ['live', 'replay'] as const) {
    for (const position of ['history', 'bottom'] as const) {
      test(`preserves ${position} while ${kind} chrome opens and closes`, async ({ page, extension }) => {
        await patchOverlayStore(extension, {
          geometry,
          profile: {
            appearance: { spacing: 0, fontSize: 14, showSuperChatBar: false },
            display: { contentMode: 'messages-only', idleVisibility: 'always-visible' },
          },
        })
        const scenario = new YouTubeScenario(page)
        const overlay = new ExtensionOverlay(page)
        await scenario.load(kind === 'live' ? scenarioState : {
          ...scenarioState,
          video: { ...scenarioState.video, mode: 'archive' },
          chat: { mode: 'archive', native: { state: 'playable' }, response: 'playable' },
        })
        await scenario.enterFullscreen()
        await overlay.expectChatLoaded({ timeout: 12000 })
        await installNativeLayoutProbe(page, 'nested', kind === 'live' ? 'live' : 'replay-header')
        await page.mouse.move(1000, 600)
        await expect.poll(() => readLayout(page)).toMatchObject({ collapsed: true, headerHeight: 0, inputHeight: 0, flowTopInset: 12 })
        const chat = page.frameLocator('iframe[data-ylc-chat]')
        await expect(chat.locator('body')).not.toHaveClass(/chat-only-transition-ready/)
        await expect.poll(() => chat.locator('#item-scroller').evaluate(scroller => scroller.style.getPropertyValue('overflow-anchor'))).toBe('')
        await chat.locator('#item-scroller').evaluate((scroller, position) => {
          scroller.scrollTop = position === 'bottom' ? scroller.scrollHeight : 240
        }, position)
        await expect(chat.locator('#show-more')).toHaveCSS('visibility', position === 'bottom' ? 'hidden' : 'visible')
        await chat.locator('body').evaluate(body => {
          const view = body.ownerDocument.defaultView
          const jump = body.querySelector('#show-more')
          if (!view || !jump) throw new Error('Missing jump control.')
          const samples: string[] = []
          let active = true
          const tick = () => view.requestAnimationFrame(() => view.setTimeout(() => {
            if (!active) return
            samples.push(view.getComputedStyle(jump).visibility)
            tick()
          }, 0))
          tick()
          Object.assign(view, { stopJumpSampling: () => { active = false; return samples } })
        })
        const before = await readScrollAnchor(page)
        if (position === 'bottom') expect(before.bottom).toBeLessThanOrEqual(1)
        await overlay.frame().hover({ position: { x: 100, y: 100 } })
        await expect(chat.locator('body')).not.toHaveClass(/chat-only-display/)
        await expect(chat.locator('body')).not.toHaveClass(/chat-only-transition-ready/)
        const expanded = await readScrollAnchor(page)
        if (position === 'history') expect(expanded.y).toBeCloseTo(before.y, 0)
        else expect(expanded.bottom).toBeLessThanOrEqual(1)
        await chat.locator('#items').evaluate(items => {
          const row = items.ownerDocument.createElement('yt-live-chat-text-message-renderer')
          row.textContent = 'Fixture message arriving after the transition'
          items.append(row)
        })
        await expect.poll(async () => {
          const current = await readScrollAnchor(page)
          return position === 'history' ? Math.abs(current.y - before.y) : current.bottom
        }).toBeLessThanOrEqual(1)
        await page.mouse.move(1000, 600)
        await expect(chat.locator('body')).toHaveClass(/chat-only-display/)
        await expect(chat.locator('body')).not.toHaveClass(/chat-only-transition-ready/)
        const collapsed = await readScrollAnchor(page)
        if (position === 'history') expect(collapsed.y).toBeCloseTo(before.y, 0)
        else expect(collapsed.bottom).toBeLessThanOrEqual(1)
        const jumpSamples = await chat.locator('body').evaluate(body =>
          (body.ownerDocument.defaultView as unknown as { stopJumpSampling: () => string[] }).stopJumpSampling())
        expect(jumpSamples.length).toBeGreaterThan(5)
        expect(new Set(jumpSamples)).toEqual(new Set([position === 'bottom' ? 'hidden' : 'visible']))
        if (position === 'history') {
          await overlay.frame().hover({ position: { x: 100, y: 100 } })
          await page.mouse.wheel(0, 100)
          await expect.poll(async () => (await readScrollAnchor(page)).scrollTop).toBeGreaterThan(before.scrollTop + 75)
          const manual = await readScrollAnchor(page)
          await expect(chat.locator('body')).not.toHaveClass(/chat-only-transition-ready/)
          expect((await readScrollAnchor(page)).scrollTop).toBeCloseTo(manual.scrollTop, 0)
        }
      })
    }
  }
})

for (const navigation of ['participants', 'style', 'hidden', 'aria-hidden', 'class', 'detach', 'replace'] as const) {
  test(`releases chat layout ownership across ${navigation} view changes`, async ({ page, extension }, testInfo) => {
    await patchOverlayStore(extension, {
      geometry,
      profile: { display: { contentMode: 'messages-only', idleVisibility: 'always-visible' } },
    })
    const scenario = new YouTubeScenario(page)
    await scenario.load(scenarioState)
    await scenario.enterFullscreen()
    const overlay = new ExtensionOverlay(page)
    await overlay.expectChatLoaded({ timeout: 12000 })
    await installNativeLayoutProbe(page, 'nested')
    const chat = page.frameLocator('iframe[data-ylc-chat]')
    await chat.locator('body').evaluate((body, mode) => {
      const doc = body.ownerDocument
      const pages = doc.querySelector<HTMLElement>('#content-pages')!
      let messages = doc.querySelector<HTMLElement>('#chat-messages')!
      pages.style.position = 'relative'
      const rules = doc.createElement('style')
      rules.textContent = '.fixture-main-hidden, [aria-hidden="true"] { display:none !important; }'
      doc.head.append(rules)
      const panel = doc.createElement(mode === 'participants' ? 'yt-live-chat-participant-list-renderer' : 'section')
      panel.setAttribute('data-fixture-auxiliary', '')
      panel.style.cssText = 'display:none;position:absolute;inset:0;flex-direction:column'
      panel.innerHTML = '<div id="header"><button aria-label="Return to chat">Back</button>Auxiliary view</div><div>Fixture content</div>'
      pages.append(panel)
      const menu = doc.createElement('button')
      menu.textContent = 'Open view'
      menu.setAttribute('aria-label', 'Open auxiliary view')
      doc.querySelector('yt-live-chat-header-renderer')!.append(menu)
      menu.onclick = () => {
        if (mode === 'hidden') messages.hidden = true
        else if (mode === 'aria-hidden') messages.setAttribute('aria-hidden', 'true')
        else if (mode === 'class') messages.classList.add('fixture-main-hidden')
        else if (mode === 'detach') messages.remove()
        else messages.style.display = 'none'
        if (mode === 'replace') {
          const replacement = messages.cloneNode(true) as HTMLElement
          messages.replaceWith(replacement)
          messages = replacement
        }
        if (mode === 'participants') panel.classList.add('iron-selected')
        panel.style.display = 'flex'
      }
      panel.querySelector<HTMLButtonElement>('button')!.onclick = () => {
        panel.classList.remove('iron-selected')
        panel.style.display = 'none'
        if (mode === 'detach') pages.append(messages)
        messages.hidden = false
        messages.removeAttribute('aria-hidden')
        messages.classList.remove('fixture-main-hidden')
        messages.style.display = ''
      }
    }, navigation)
    await overlay.frame().hover()
    await chat.getByRole('button', { name: 'Open auxiliary view' }).click()
    const auxiliary = chat.locator('[data-fixture-auxiliary]')
    await expect(auxiliary).toBeVisible()
    await page.mouse.move(1100, 600)
    const bounds = async () => auxiliary.evaluate(element => {
      const rect = element.getBoundingClientRect()
      return { top: rect.top, bottom: element.ownerDocument.defaultView!.innerHeight - rect.bottom }
    })
    await expect.poll(bounds).toEqual({ top: 0, bottom: 0 })
    await page.waitForTimeout(700)
    expect(await bounds()).toEqual({ top: 0, bottom: 0 })
    await page.screenshot({ path: testInfo.outputPath('auxiliary-without-edge-gaps.png') })
    await chat.getByRole('button', { name: 'Return to chat' }).click()
    await expect.poll(() => readLayout(page)).toMatchObject({ flowTopInset: 0, flowBottomInset: 0, headerHeight: 56, inputHeight: 64 })
    await page.waitForTimeout(400)
    expect(await readLayout(page)).toMatchObject({ flowTopInset: 0, flowBottomInset: 0, headerHeight: 56, inputHeight: 64 })
    await page.screenshot({ path: testInfo.outputPath('chat-restored-without-stale-gaps.png') })
    await page.mouse.move(1100, 600)
    await expect.poll(() => readLayout(page)).toMatchObject({ flowTopInset: 12, flowBottomInset: 12, headerHeight: 0, inputHeight: 0 })
  })
}
