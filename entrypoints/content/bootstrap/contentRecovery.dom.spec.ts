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

it('accepts only the extension popup and fixed request schemas, and removes the listener', async () => {
  const add = vi.spyOn(browser.runtime.onMessage, 'addListener')
  const remove = vi.spyOn(browser.runtime.onMessage, 'removeListener')
  const bootstrap = { getStatus: vi.fn(() => ({ status: 'starting' as const, token: 'one' })), retry: vi.fn() }
  const dispose = registerContentStatusMessaging(bootstrap)
  const listener = add.mock.calls[0]?.[0]
  if (!listener) throw new Error('Listener missing')
  const sender = { id: browser.runtime.id, url: browser.runtime.getURL('/popup.html') }
  listener({ type: 'ylc:status' }, { ...sender, id: 'other' }, vi.fn())
  listener({ type: 'ylc:status' }, { ...sender, url: 'https://www.youtube.com' }, vi.fn())
  listener({ type: 'ylc:retry', token: 'one', arbitrary: true }, sender, vi.fn())
  expect(bootstrap.getStatus).not.toHaveBeenCalled()
  await listener({ type: 'ylc:status' }, sender, vi.fn())
  expect(bootstrap.getStatus).toHaveBeenCalledOnce()
  dispose()
  expect(remove).toHaveBeenCalledWith(listener)
})
