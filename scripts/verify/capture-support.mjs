const BOOLEAN_OPTIONS = new Set(['background', 'video-only', 'require-composer'])

export const parseCaptureViewport = value => {
  if (value === undefined) return undefined
  const match = typeof value === 'string' ? value.match(/^([1-9]\d*)x([1-9]\d*)$/) : null
  const width = Number(match?.[1])
  const height = Number(match?.[2])
  if (!match || !Number.isInteger(width) || !Number.isInteger(height) || width < 64 || height < 64 || width > 8192 || height > 8192) {
    throw new Error('--viewport must be WIDTHxHEIGHT with integer dimensions from 64 to 8192.')
  }
  return { width, height }
}

export const parseCaptureArgs = argv => {
  const args = new Map()
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) throw new Error('Unexpected positional argument. Use --url-includes or --target-id.')
    const separator = arg.indexOf('=')
    const key = arg.slice(2, separator === -1 ? undefined : separator)
    if (BOOLEAN_OPTIONS.has(key)) {
      if (separator !== -1) throw new Error(`--${key} does not accept a value`)
      args.set(key, true)
    } else {
      const value = separator === -1 ? argv[++index] : arg.slice(separator + 1)
      if (!value || value.startsWith('--')) throw new Error(`--${key} requires a value`)
      args.set(key, value)
    }
  }
  if (args.has('video-only') && !args.has('background')) throw new Error('--video-only requires --background')
  if (args.has('require-composer') && !args.has('background')) throw new Error('--require-composer requires --background')
  if (args.has('viewport') && !args.has('background')) throw new Error('--viewport requires --background')
  if (args.has('background') && !args.has('profile')) throw new Error('--background requires the dedicated browser --profile')
  if (args.has('viewport')) args.set('viewport', parseCaptureViewport(args.get('viewport')))
  return args
}

export const selectCaptureTarget = (targets, { targetId, urlIncludes }) => {
  const candidates = targets.filter(target => (targetId ? target.id === targetId : target.url.includes(urlIncludes)))
  if (candidates.length !== 1) {
    throw new Error(`Expected exactly one capture target; found ${candidates.length}. Specify --target-id for an exact target.`)
  }
  return candidates[0]
}

export const resolveCapturePage = async (browser, options) => {
  const targets = []
  for (const page of browser.contexts().flatMap(context => context.pages())) {
    const session = await page.context().newCDPSession(page)
    try {
      const { targetInfo } = await session.send('Target.getTargetInfo')
      targets.push({ id: targetInfo.targetId, url: page.url(), page })
    } finally {
      await session.detach()
    }
  }
  return selectCaptureTarget(targets, options)
}

export const videoContentClip = ({ bounds, videoWidth, videoHeight, objectFit, objectPosition, viewport }) => {
  if (!(videoWidth > 0 && videoHeight > 0 && bounds.width > 0 && bounds.height > 0)) {
    throw new Error('A decoded video with visible dimensions is required for --video-only.')
  }
  let { x, y, width, height } = bounds
  if (objectFit === 'contain' || objectFit === 'scale-down') {
    if (objectPosition !== '50% 50%') throw new Error('--video-only requires a centered video content box.')
    const scale = Math.min(width / videoWidth, height / videoHeight, objectFit === 'scale-down' ? 1 : Number.POSITIVE_INFINITY)
    const contentWidth = videoWidth * scale
    const contentHeight = videoHeight * scale
    x += (width - contentWidth) / 2
    y += (height - contentHeight) / 2
    width = contentWidth
    height = contentHeight
  } else if (objectFit !== 'fill' && objectFit !== 'cover') {
    throw new Error(`Unsupported video object-fit: ${objectFit}`)
  } else if (Math.abs(width - (height * videoWidth) / videoHeight) > 1) {
    throw new Error('The video is cropped or stretched; --video-only requires the complete source aspect ratio.')
  }
  if (x < -1 || y < -1 || x + width > viewport.width + 1 || y + height > viewport.height + 1) {
    throw new Error('The video content extends outside the viewport; --video-only would omit source content.')
  }
  const left = Math.ceil(Math.max(0, x))
  const top = Math.ceil(Math.max(0, y))
  const right = Math.floor(Math.min(viewport.width, x + width))
  const bottom = Math.floor(Math.min(viewport.height, y + height))
  if (right <= left || bottom <= top) throw new Error('The video content box is outside the capture viewport.')
  return { x: left, y: top, width: right - left, height: bottom - top, scale: 1 }
}

const readVideoSurface = () => {
  const video = document.querySelector('video.html5-main-video') ?? document.querySelector('video')
  if (!video || video.readyState < 2) return null
  const rect = video.getBoundingClientRect()
  const style = getComputedStyle(video)
  return {
    bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    objectFit: style.objectFit,
    objectPosition: style.objectPosition,
    viewport: { width: innerWidth, height: innerHeight },
  }
}

export const waitForVideoCaptureSurface = async (page, { timeout }) => {
  const deadline = Date.now() + timeout
  let readinessError = new Error('The video has not decoded a visible frame.')
  while (true) {
    const surface = await page.evaluate(readVideoSurface)
    if (surface) {
      try {
        videoContentClip(surface)
        return surface
      } catch (error) {
        readinessError = error
      }
    }
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw readinessError
    await page.waitForTimeout(Math.min(100, remaining))
  }
}

const paintedElement = element => {
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false
  for (let current = element; current; current = current.parentElement ?? current.getRootNode()?.host) {
    const style = getComputedStyle(current)
    if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) return false
    if (current.matches('[disabled], [aria-disabled="true"], [inert]')) return false
  }
  return true
}

const hitTestableInput = element => {
  const document = element.ownerDocument
  const viewport = document.defaultView
  if (!viewport) return false
  const rect = element.getBoundingClientRect()
  const left = Math.max(0, rect.left)
  const top = Math.max(0, rect.top)
  const right = Math.min(viewport.innerWidth, rect.right)
  const bottom = Math.min(viewport.innerHeight, rect.bottom)
  if (right <= left || bottom <= top) return false
  const x = (left + right) / 2
  const y = (top + bottom) / 2
  let hit = document.elementFromPoint(x, y)
  while (hit?.shadowRoot) {
    const nested = hit.shadowRoot.elementFromPoint(x, y)
    if (!nested || nested === hit) break
    hit = nested
  }
  return hit === element || element.contains(hit)
}

export const hasUsableNativeComposer = async page => {
  const iframe = page.locator('#shadow-root-live-chat iframe:not([data-ylc-settings-frame])')
  if ((await iframe.count()) !== 1 || !(await iframe.evaluate(paintedElement).catch(() => false))) return false
  const handle = await iframe.elementHandle()
  try {
    const frame = await handle?.contentFrame()
    if (!frame) return false
    const inputs = frame.locator(
      'yt-live-chat-message-input-renderer [contenteditable]:not([contenteditable="false"]), #input-panel [contenteditable]:not([contenteditable="false"])',
    )
    for (let index = 0; index < (await inputs.count()); index += 1) {
      const input = inputs.nth(index)
      if (
        (await input.isEditable().catch(() => false)) &&
        (await input.evaluate(paintedElement).catch(() => false)) &&
        (await input.evaluate(hitTestableInput).catch(() => false))
      )
        return true
    }
    return false
  } finally {
    await handle?.dispose()
  }
}

export const captureFullscreenSurface = async (
  page,
  { stateReader, videoOnly = false, requireComposer = false, viewport, timeout = 30000 },
) => {
  const session = await page.context().newCDPSession(page)
  let restoreTargetId = null
  let metricsApplied = false
  let method = 'headed-focus-emulation'
  try {
    const version = await session.send('Browser.getVersion')
    if (version.userAgent.includes('HeadlessChrome')) {
      method = 'headless-target-surface'
      for (const candidate of page.context().pages()) {
        if (!(await candidate.evaluate(() => document.hasFocus()).catch(() => false))) continue
        const candidateSession = await page.context().newCDPSession(candidate)
        try {
          const { targetInfo } = await candidateSession.send('Target.getTargetInfo')
          restoreTargetId = targetInfo.targetId
        } finally {
          await candidateSession.detach()
        }
        break
      }
      const { targetInfo } = await session.send('Target.getTargetInfo')
      await session.send('Target.activateTarget', { targetId: targetInfo.targetId })
    }
    await session.send('Emulation.setFocusEmulationEnabled', { enabled: true })
    if (!(await page.evaluate(() => Boolean(document.fullscreenElement)))) {
      await page.locator('button.ytp-fullscreen-button, .ytp-fullscreen-button').first().click({ timeout })
    }
    await page.waitForFunction(() => Boolean(document.fullscreenElement), undefined, { timeout })
    if (viewport) {
      await session.send('Emulation.setDeviceMetricsOverride', {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: false,
        screenWidth: viewport.width,
        screenHeight: viewport.height,
      })
      metricsApplied = true
      await page.waitForFunction(size => innerWidth === size.width && innerHeight === size.height, viewport, { timeout })
    }
    const deadline = Date.now() + timeout
    let mounted = false
    while (Date.now() < deadline) {
      const state = await page.evaluate(stateReader)
      if (state?.fullscreen && state?.overlayMounted) {
        mounted = true
        break
      }
      await page.waitForTimeout(100)
    }
    if (!mounted) throw new Error('Actual fullscreen YLC overlay did not mount.')
    if (requireComposer) {
      const composerDeadline = Date.now() + timeout
      while (!(await hasUsableNativeComposer(page))) {
        if (Date.now() >= composerDeadline)
          throw new Error('A visible, enabled native chat composer is required; no screenshot was accepted.')
        await page.waitForTimeout(100)
      }
    }
    await page.mouse.move(1, 1)
    await page.waitForTimeout(500)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const state = await page.evaluate(stateReader)
    if (!state?.fullscreen || !state?.overlayMounted) throw new Error('Actual fullscreen YLC overlay did not mount.')
    const readySurface = videoOnly ? await waitForVideoCaptureSurface(page, { timeout }) : null
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const surface = videoOnly ? (attempt === 1 ? readySurface : await page.evaluate(readVideoSurface)) : null
      if (videoOnly && !surface) throw new Error('The video has not decoded a visible frame.')
      const clip = surface ? videoContentClip(surface) : undefined
      const beforeViewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
      if (viewport && (beforeViewport.width !== viewport.width || beforeViewport.height !== viewport.height)) {
        throw new Error('The requested fullscreen viewport was not preserved; no screenshot was accepted.')
      }
      const { data } = await session.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
        ...(clip ? { clip } : {}),
      })
      if (!(await page.evaluate(() => Boolean(document.fullscreenElement)))) {
        throw new Error('Fullscreen ended during capture; no screenshot was accepted.')
      }
      const afterViewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
      const after = videoOnly ? await page.evaluate(readVideoSurface) : null
      const sameVideo = !videoOnly || (after && JSON.stringify(videoContentClip(after)) === JSON.stringify(clip))
      if (sameVideo && JSON.stringify(beforeViewport) === JSON.stringify(afterViewport)) {
        const finalState = await page.evaluate(stateReader)
        if (!finalState?.fullscreen || !finalState?.overlayMounted) throw new Error('The fullscreen overlay changed during capture.')
        const composerAvailable = await hasUsableNativeComposer(page)
        if (requireComposer && !composerAvailable) throw new Error('The native chat composer became unavailable during capture.')
        finalState.composerAvailable = composerAvailable
        return { png: Buffer.from(data, 'base64'), state: finalState, clip: clip ?? null, method, captureAttempts: attempt }
      }
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    }
    throw new Error('Video geometry changed during capture; no screenshot was accepted. Retry after layout settles.')
  } finally {
    try {
      if (metricsApplied) await session.send('Emulation.clearDeviceMetricsOverride')
    } finally {
      try {
        await session.send('Emulation.setFocusEmulationEnabled', { enabled: false })
      } finally {
        try {
          if (restoreTargetId) await session.send('Target.activateTarget', { targetId: restoreTargetId })
        } finally {
          await session.detach()
        }
      }
    }
  }
}
