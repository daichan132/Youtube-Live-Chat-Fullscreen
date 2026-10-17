import { afterEach, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { ContentBootstrap } from './ContentBootstrap'
import { registerContentStatusMessaging } from './contentStatusMessaging'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})
it('retries exhausted startup once and rejects stale or repeated requests', async () => {
  vi.useFakeTimers()
  let href = 'https://www.youtube.com/watch?v=first'
  const restart = vi.fn()
  const create = vi.fn().mockRejectedValue(new Error('startup'))
  const bootstrap = new ContentBootstrap(create, { readHref: () => href })
  bootstrap.start()
  await vi.runAllTimersAsync()
  expect(bootstrap.getStatus().status).toBe('failed')
  const token = bootstrap.getStatus().token
  create.mockResolvedValue({ dispose: vi.fn(), restart })
  expect(bootstrap.retry(token).retry).toBe('accepted')
  bootstrap.retry(token)
  await vi.runAllTimersAsync()
  expect(create).toHaveBeenCalledTimes(4)
  expect(bootstrap.getStatus().status).toBe('running')
  const runningToken = bootstrap.getStatus().token
  href = 'https://www.youtube.com/watch?v=second'
  expect(bootstrap.retry(runningToken).retry).toBe('stale')
  expect(restart).not.toHaveBeenCalled()
  const fresh = bootstrap.getStatus().token
  expect(bootstrap.retry(fresh).retry).toBe('accepted')
  expect(bootstrap.retry(fresh).retry).toBe('stale')
  expect(restart).toHaveBeenCalledTimes(1)
  bootstrap.dispose()
})

it('delivers current status and retry results only to the extension popup, then removes the listener', async () => {
  vi.useFakeTimers()
  const add = vi.spyOn(browser.runtime.onMessage, 'addListener')
  const remove = vi.spyOn(browser.runtime.onMessage, 'removeListener')
  const restart = vi.fn()
  const session = { dispose: vi.fn(), restart }
  const create = vi.fn(async () => session)
  const bootstrap = new ContentBootstrap(create, { readHref: () => 'https://www.youtube.com/watch?v=private-video' })
  const dispose = registerContentStatusMessaging(bootstrap)
  try {
    bootstrap.start()
    await vi.advanceTimersByTimeAsync(0)
    const listener = add.mock.calls[0]?.[0]
    if (!listener) throw new Error('Listener missing')
    const deliver = (...args: Parameters<typeof listener>): unknown => listener(...args)
    const sender = { id: browser.runtime.id, url: browser.runtime.getURL('/popup.html') }
    const response = await deliver({ type: 'ylc:status' }, sender, vi.fn())
    expect(response).toEqual({ status: 'running', token: expect.any(String) })
    if (!response || typeof response !== 'object' || !('token' in response) || typeof response.token !== 'string')
      throw new Error('Missing status token')
    const token = response.token

    for (const [request, untrustedSender] of [
      [
        { type: 'ylc:retry', token },
        { ...sender, id: 'other' },
      ],
      [
        { type: 'ylc:retry', token },
        { ...sender, url: 'https://www.youtube.com' },
      ],
      [{ type: 'ylc:retry', token, arbitrary: true }, sender],
      [{ type: 'ylc:status', arbitrary: true }, sender],
    ] as const) {
      expect(await deliver(request, untrustedSender, vi.fn())).toBeUndefined()
    }
    expect(restart).not.toHaveBeenCalled()

    const retry = await deliver({ type: 'ylc:retry', token }, sender, vi.fn())
    expect(retry).toEqual({ status: 'running', token: expect.any(String), retry: 'accepted' })
    expect(restart).toHaveBeenCalledOnce()
    const repeated = await deliver({ type: 'ylc:retry', token }, sender, vi.fn())
    expect(repeated).toEqual({ status: 'running', token: expect.any(String), retry: 'stale' })
    expect(restart).toHaveBeenCalledOnce()
    expect(JSON.stringify([response, retry, repeated])).not.toContain('private-video')
  } finally {
    dispose()
    bootstrap.dispose()
  }
  expect(remove).toHaveBeenCalledWith(add.mock.calls[0]?.[0])
  expect(session.dispose).toHaveBeenCalledOnce()
})
