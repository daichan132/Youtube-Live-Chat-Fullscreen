import { act, render } from '@testing-library/react'
import { describe, expect, it, type vi } from 'vitest'
import { useMessage } from './useMessage'

type RuntimeWithHelpers = {
  __emitMessage: (message: unknown) => void
}

const MessageViewer = () => {
  const { message } = useMessage<{ type: string }>()
  return <div data-testid='message'>{message?.type ?? 'empty'}</div>
}

describe('useMessage', () => {
  it('registers and unregisters the message listener', () => {
    const { unmount } = render(<MessageViewer />)
    const addListener = chrome.runtime.onMessage.addListener as unknown as ReturnType<typeof vi.fn>
    const removeListener = chrome.runtime.onMessage.removeListener as unknown as ReturnType<typeof vi.fn>

    expect(addListener).toHaveBeenCalledTimes(1)

    unmount()

    expect(removeListener).toHaveBeenCalledTimes(1)
  })

  it('updates state when a message is received', () => {
    const { getByTestId } = render(<MessageViewer />)
    const runtime = (chrome as unknown as { runtime: RuntimeWithHelpers }).runtime

    expect(getByTestId('message')).toHaveTextContent('empty')

    act(() => {
      runtime.__emitMessage({ type: 'ping' })
    })

    expect(getByTestId('message')).toHaveTextContent('ping')
  })
})
