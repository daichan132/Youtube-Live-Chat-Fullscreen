import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { ContentRecovery } from './ContentRecovery'

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
