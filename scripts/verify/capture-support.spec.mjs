import { describe, expect, it, vi } from 'vitest'
import {
  captureFullscreenSurface,
  parseCaptureArgs,
  selectCaptureTarget,
  videoContentClip,
  waitForVideoCaptureSurface,
} from './capture-support.mjs'

describe('capture target and surface contracts', () => {
  it('parses background flags without consuming the next option', () => {
    const args = parseCaptureArgs(['--background', '--video-only', '--require-composer', '--profile', '/tmp/capture', '--target-id=EXACT'])
    expect(args.get('background')).toBe(true)
    expect(args.get('video-only')).toBe(true)
    expect(args.get('require-composer')).toBe(true)
    expect(args.get('profile')).toBe('/tmp/capture')
    expect(args.get('target-id')).toBe('EXACT')
  })

  it('requires an explicitly dedicated profile for background captures', () => {
    expect(() => parseCaptureArgs(['--background'])).toThrow('--profile')
    expect(() => parseCaptureArgs(['--video-only'])).toThrow('--background')
    expect(() => parseCaptureArgs(['--require-composer'])).toThrow('--background')
    expect(() => parseCaptureArgs(['--viewport', '1600x900'])).toThrow('--background')
    expect(() => parseCaptureArgs(['--profile', '--background'])).toThrow('requires a value')
  })

  it('accepts explicit background viewport dimensions and leaves unspecified dimensions alone', () => {
    expect(parseCaptureArgs(['--background', '--profile', '/tmp/capture', '--viewport', '1600x900']).get('viewport')).toEqual({
      width: 1600,
      height: 900,
    })
    expect(parseCaptureArgs(['--background', '--profile', '/tmp/capture', '--viewport=64x8192']).get('viewport')).toEqual({
      width: 64,
      height: 8192,
    })
    expect(parseCaptureArgs(['--background', '--profile', '/tmp/capture']).has('viewport')).toBe(false)
  })

  it('rejects malformed or unbounded viewport dimensions before capturing', () => {
    for (const value of ['0x900', '63x900', '8193x900', '1600x63', '1600x8193', '1600X900', '1600.5x900', '01600x900', '1600x900px']) {
      expect(() => parseCaptureArgs(['--background', '--profile', '/tmp/capture', '--viewport', value])).toThrow('--viewport must be')
    }
    expect(() => parseCaptureArgs(['--background', '--profile', '/tmp/capture', '--viewport'])).toThrow('requires a value')
  })

  it('rejects ambiguous URL matches instead of choosing the first open stream', () => {
    const targets = [
      { id: 'A', url: 'https://www.youtube.com/watch?v=one' },
      { id: 'B', url: 'https://www.youtube.com/watch?v=two' },
    ]
    expect(() => selectCaptureTarget(targets, { urlIncludes: 'youtube.com/watch' })).toThrow('found 2')
    expect(selectCaptureTarget(targets, { targetId: 'B' }).id).toBe('B')
    expect(() => selectCaptureTarget(targets, { targetId: 'missing' })).toThrow('found 0')
  })

  it('excludes letterboxing using actual decoded dimensions without resizing pixels', () => {
    const clip = videoContentClip({
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      videoWidth: 1440,
      videoHeight: 1080,
      objectFit: 'contain',
      objectPosition: '50% 50%',
      viewport: { width: 1920, height: 1080 },
    })
    expect(clip).toEqual({ x: 240, y: 0, width: 1440, height: 1080, scale: 1 })
  })

  it('rejects undecoded videos rather than inventing a 16:9 crop', () => {
    expect(() =>
      videoContentClip({
        bounds: { x: 0, y: 0, width: 1920, height: 1080 },
        videoWidth: 0,
        videoHeight: 0,
        objectFit: 'contain',
        objectPosition: '50% 50%',
        viewport: { width: 1920, height: 1080 },
      }),
    ).toThrow('decoded video')
  })

  it('rejects video content outside the viewport instead of silently omitting it', () => {
    expect(() =>
      videoContentClip({
        bounds: { x: -10, y: 0, width: 200, height: 100 },
        videoWidth: 200,
        videoHeight: 100,
        objectFit: 'contain',
        objectPosition: '50% 50%',
        viewport: { width: 200, height: 100 },
      }),
    ).toThrow('omit source content')
  })

  it('rejects cover or fill when the displayed and decoded aspect ratios differ', () => {
    for (const objectFit of ['cover', 'fill']) {
      expect(() =>
        videoContentClip({
          bounds: { x: 0, y: 0, width: 200, height: 100 },
          videoWidth: 100,
          videoHeight: 100,
          objectFit,
          objectPosition: '50% 50%',
          viewport: { width: 200, height: 100 },
        }),
      ).toThrow('complete source aspect ratio')
    }
  })

  it('allows only subpixel edge alignment when normalizing the capture region', () => {
    expect(
      videoContentClip({
        bounds: { x: -0.5, y: -0.5, width: 201, height: 101 },
        videoWidth: 201,
        videoHeight: 101,
        objectFit: 'contain',
        objectPosition: '50% 50%',
        viewport: { width: 200, height: 100 },
      }),
    ).toEqual({ x: 0, y: 0, width: 200, height: 100, scale: 1 })
  })

  it('waits for decoded cover and fill videos to finish resizing without accepting a cropped intermediate box', async () => {
    for (const objectFit of ['cover', 'fill']) {
      let elapsed = 0
      const now = vi.spyOn(Date, 'now').mockImplementation(() => elapsed)
      try {
        const resized = {
          bounds: { x: 0, y: 0, width: 1600, height: 900 },
          videoWidth: 1280,
          videoHeight: 720,
          objectFit,
          objectPosition: '50% 50%',
          viewport: { width: 1600, height: 900 },
        }
        const resizing = { ...resized, bounds: { x: 0, y: 0, width: 1280, height: 900 } }
        const page = {
          evaluate: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(resizing).mockResolvedValue(resized),
          waitForTimeout: vi.fn(async duration => {
            elapsed += duration
          }),
        }
        expect(() => videoContentClip(resizing)).toThrow('complete source aspect ratio')
        const surface = await waitForVideoCaptureSurface(page, { timeout: 250 })
        expect(videoContentClip(surface)).toEqual({ x: 0, y: 0, width: 1600, height: 900, scale: 1 })
        expect(elapsed).toBeLessThanOrEqual(250)
      } finally {
        now.mockRestore()
      }
    }
  })

  it('keeps the crop guard and the original deadline when video sizing never becomes valid', async () => {
    let elapsed = 0
    const now = vi.spyOn(Date, 'now').mockImplementation(() => elapsed)
    try {
      const page = {
        evaluate: async () => ({
          bounds: { x: 0, y: 0, width: 1280, height: 900 },
          videoWidth: 1280,
          videoHeight: 720,
          objectFit: 'cover',
          objectPosition: '50% 50%',
          viewport: { width: 1600, height: 900 },
        }),
        waitForTimeout: vi.fn(async duration => {
          elapsed += duration
        }),
      }
      await expect(waitForVideoCaptureSurface(page, { timeout: 250 })).rejects.toThrow('complete source aspect ratio')
      expect(elapsed).toBe(250)
    } finally {
      now.mockRestore()
    }
  })

  it('rejects an unavailable decoded frame at the readiness deadline', async () => {
    const page = { evaluate: async () => null, waitForTimeout: vi.fn() }
    await expect(waitForVideoCaptureSurface(page, { timeout: 0 })).rejects.toThrow('decoded a visible frame')
    expect(page.waitForTimeout).not.toHaveBeenCalled()
  })

  it('does not activate a headed target and clears emulation when native fullscreen is rejected', async () => {
    const send = vi.fn(async method => (method === 'Browser.getVersion' ? { userAgent: 'Chrome/150.0.0.0' } : {}))
    const detach = vi.fn(async () => {})
    const page = {
      context: () => ({ newCDPSession: async () => ({ send, detach }) }),
      evaluate: async () => false,
      locator: () => ({ first: () => ({ click: async () => {} }) }),
      waitForFunction: async () => {
        throw new Error('Native fullscreen rejected')
      },
    }
    await expect(captureFullscreenSurface(page, { stateReader: () => ({}), timeout: 10 })).rejects.toThrow('Native fullscreen rejected')
    expect(send.mock.calls.some(([method]) => method === 'Target.activateTarget')).toBe(false)
    expect(send).toHaveBeenLastCalledWith('Emulation.setFocusEmulationEnabled', { enabled: false })
    expect(detach).toHaveBeenCalledOnce()
    expect(send.mock.calls.some(([method]) => method === 'Page.captureScreenshot')).toBe(false)
    expect(send.mock.calls.some(([method]) => method === 'Emulation.clearDeviceMetricsOverride')).toBe(false)
  })

  it('applies viewport metrics after native fullscreen on the capture session and clears them before restoring focus', async () => {
    const lifecycle = []
    const send = vi.fn(async (method, params) => {
      lifecycle.push({ method, params })
      return method === 'Browser.getVersion' ? { userAgent: 'Chrome/150.0.0.0' } : {}
    })
    const detach = vi.fn(async () => lifecycle.push({ method: 'detach' }))
    const waitForFunction = vi.fn(async () => {
      if (waitForFunction.mock.calls.length === 1) {
        lifecycle.push({ method: 'native-fullscreen-confirmed' })
        return
      }
      throw new Error('Viewport verification failed')
    })
    const page = {
      context: () => ({ newCDPSession: async () => ({ send, detach }) }),
      evaluate: async () => false,
      locator: () => ({ first: () => ({ click: async () => {} }) }),
      waitForFunction,
    }
    await expect(
      captureFullscreenSurface(page, { stateReader: () => ({}), viewport: { width: 1600, height: 900 }, timeout: 10 }),
    ).rejects.toThrow('Viewport verification failed')
    expect(lifecycle.slice(2)).toEqual([
      { method: 'native-fullscreen-confirmed' },
      {
        method: 'Emulation.setDeviceMetricsOverride',
        params: { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1600, screenHeight: 900 },
      },
      { method: 'Emulation.clearDeviceMetricsOverride', params: undefined },
      { method: 'Emulation.setFocusEmulationEnabled', params: { enabled: false } },
      { method: 'detach' },
    ])
    expect(send.mock.calls.some(([method]) => method === 'Page.captureScreenshot')).toBe(false)
  })
})
