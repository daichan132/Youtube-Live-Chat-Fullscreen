import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { OverlayControlRail } from './OverlayControlRail'

it('reaches hidden ready controls by Tab and keeps focus visible after pointer exit', async () => {
  const user = userEvent.setup()
  const move = vi.fn()
  render(
    <OverlayControlRail
      isDragging={false}
      isReady
      isVisible={false}
      placement={{}}
      backgroundColor={{ r: 0, g: 0, b: 0, a: 1 }}
      fontColor={{ r: 255, g: 255, b: 255, a: 1 }}
      onSettingsClick={vi.fn()}
      onPointerDown={vi.fn()}
      onKeyDown={vi.fn()}
      onEnterControls={vi.fn()}
      onLeaveControls={vi.fn()}
      onMoveBy={move}
    />,
  )
  await user.tab()
  const settings = screen.getByRole('button', { name: 'content.aria.openSettings' })
  expect(settings).toHaveFocus()
  fireEvent.mouseLeave(settings.closest('[data-ylc-control-rail]') as HTMLElement)
  expect(settings.closest('[data-ylc-control-rail]')).toHaveStyle({ opacity: '1', transition: 'none' })
  await user.tab()
  await user.tab()
  await user.keyboard('{Enter}')
  await user.click(screen.getByRole('button', { name: 'content.placement.up' }))
  expect(move).toHaveBeenCalledWith({ x: 0, y: -10 })
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('group')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'content.placement.open' })).toHaveFocus()
  expect(move).toHaveBeenCalledTimes(1)
})
