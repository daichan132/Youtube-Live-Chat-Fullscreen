import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { ContentRecovery } from './ContentRecovery'

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(fulfill => {
    resolve = fulfill
  })
  return { promise, resolve }
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})
it('times out without claiming an unsupported page or retrying automatically', async () => {
  vi.useFakeTimers()
  vi.spyOn(browser.tabs, 'query').mockResolvedValue([{ id: 12 }] as never)
  const send = vi.spyOn(browser.tabs, 'sendMessage').mockImplementation(() => new Promise(() => {}))
  render(<ContentRecovery />)
  await act(() => vi.advanceTimersByTimeAsync(3000))
  expect(screen.getByText('popup.recovery.unknown')).toBeVisible()
  expect(screen.getByRole('button', { name: 'popup.recovery.retry' })).toBeDisabled()
  expect(send).toHaveBeenCalledTimes(1)
})
it('distinguishes accepted retry from display success and consumes the returned token', async () => {
  vi.spyOn(browser.tabs, 'query').mockResolvedValue([{ id: 12 }] as never)
  const send = vi
    .spyOn(browser.tabs, 'sendMessage')
    .mockResolvedValueOnce({ status: 'failed', token: 'first' } as never)
    .mockResolvedValueOnce({ status: 'starting', token: 'second', retry: 'accepted' } as never)
  render(<ContentRecovery />)
  await screen.findByText('popup.recovery.failed')
  fireEvent.click(screen.getByRole('button', { name: 'popup.recovery.retry' }))
  await screen.findByText('popup.recovery.accepted')
  expect(send).toHaveBeenLastCalledWith(12, { type: 'ylc:retry', token: 'first' }, { frameId: 0 })
})

it('finishes the current status request after StrictMode replays the mount effect', async () => {
  vi.spyOn(browser.tabs, 'query').mockResolvedValue([{ id: 12 }] as never)
  const send = vi.spyOn(browser.tabs, 'sendMessage').mockResolvedValue({ status: 'running', token: 'current' } as never)
  render(
    <StrictMode>
      <ContentRecovery />
    </StrictMode>,
  )

  await screen.findByText('popup.recovery.running')
  expect(screen.getByRole('button', { name: 'popup.recovery.check' })).toBeEnabled()
  expect(send).toHaveBeenCalledTimes(1)
})

it('ignores a stale tab query while the replacement request is pending and preserves its retry tab and token', async () => {
  const oldQuery = deferred<{ id: number }[]>()
  const currentResult = deferred<{ status: string; token: string }>()
  const query = vi
    .spyOn(browser.tabs, 'query')
    .mockReturnValueOnce(oldQuery.promise as never)
    .mockResolvedValue([{ id: 12 }] as never)
  const send = vi
    .spyOn(browser.tabs, 'sendMessage')
    .mockReturnValueOnce(currentResult.promise as never)
    .mockResolvedValue({ status: 'starting', token: 'next', retry: 'accepted' } as never)
  render(
    <StrictMode>
      <ContentRecovery />
    </StrictMode>,
  )
  await act(async () => {})
  expect(send).toHaveBeenCalledTimes(1)

  await act(async () => oldQuery.resolve([{ id: 34 }]))
  expect(screen.getByText('popup.recovery.checking')).toBeVisible()
  const check = screen.getByRole('button', { name: 'popup.recovery.check' })
  expect(check).toBeDisabled()
  fireEvent.click(check)
  expect(query).toHaveBeenCalledTimes(2)
  expect(send).toHaveBeenCalledTimes(1)

  await act(async () => currentResult.resolve({ status: 'failed', token: 'current' }))
  expect(screen.getByText('popup.recovery.failed')).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'popup.recovery.retry' }))
  await screen.findByText('popup.recovery.accepted')
  expect(send).toHaveBeenCalledTimes(2)
  expect(send).toHaveBeenLastCalledWith(12, { type: 'ylc:retry', token: 'current' }, { frameId: 0 })
})

it('does not send a status request after its pending tab query outlives the popup', async () => {
  const query = deferred<{ id: number }[]>()
  vi.spyOn(browser.tabs, 'query').mockReturnValue(query.promise as never)
  const send = vi.spyOn(browser.tabs, 'sendMessage').mockResolvedValue({ status: 'running', token: 'old' } as never)
  const { unmount } = render(<ContentRecovery />)
  unmount()
  await act(async () => query.resolve([{ id: 12 }]))
  expect(send).not.toHaveBeenCalled()
})

it('invalidates a timed-out tab query before allowing a new status request', async () => {
  vi.useFakeTimers()
  const oldQuery = deferred<{ id: number }[]>()
  vi.spyOn(browser.tabs, 'query')
    .mockReturnValueOnce(oldQuery.promise as never)
    .mockResolvedValue([{ id: 12 }] as never)
  const send = vi.spyOn(browser.tabs, 'sendMessage').mockResolvedValue({ status: 'running', token: 'current' } as never)
  render(<ContentRecovery />)

  await act(() => vi.advanceTimersByTimeAsync(3000))
  expect(screen.getByText('popup.recovery.unknown')).toBeVisible()
  expect(screen.getByRole('button', { name: 'popup.recovery.check' })).toBeEnabled()
  await act(async () => oldQuery.resolve([{ id: 34 }]))
  expect(send).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: 'popup.recovery.check' }))
  await act(async () => {})
  expect(screen.getByText('popup.recovery.running')).toBeVisible()
  expect(send).toHaveBeenCalledTimes(1)
  expect(send).toHaveBeenCalledWith(12, { type: 'ylc:status' }, { frameId: 0 })
})
