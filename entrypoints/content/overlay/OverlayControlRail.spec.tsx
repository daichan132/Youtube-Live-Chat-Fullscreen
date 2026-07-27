import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OverlayControlRail } from './OverlayControlRail'

describe('OverlayControlRail', () => {
  it('preserves semantic settings and drag controls inside an RTL surface', () => {
    const onSettingsClick = vi.fn()
    const onEnterControls = vi.fn()
    const onLeaveControls = vi.fn()

    render(
      <div dir='rtl'>
        <OverlayControlRail
          isDragging={false}
          isReady
          isVisible
          placement={{ top: 20, right: 0 }}
          backgroundColor={{ r: 1, g: 2, b: 3, a: 0.5 }}
          fontColor={{ r: 4, g: 5, b: 6, a: 0.8 }}
          onSettingsClick={onSettingsClick}
          onPointerDown={() => {}}
          onKeyDown={() => {}}
          onEnterControls={onEnterControls}
          onLeaveControls={onLeaveControls}
        />
      </div>,
    )

    const settingsButton = screen.getByRole('button', { name: 'content.aria.openSettings' })
    const dragHandle = screen.getByRole('button', { name: 'content.aria.dragToMove' })
    const rail = settingsButton.closest('[data-ylc-control-rail]') as HTMLElement

    expect(rail.closest('[dir="rtl"]')).not.toBeNull()
    expect(dragHandle).toHaveAttribute('aria-roledescription', 'drag handle')
    expect(dragHandle).toHaveAttribute('aria-describedby')

    fireEvent.mouseEnter(rail)
    fireEvent.mouseLeave(rail)
    fireEvent.click(settingsButton)

    expect(onEnterControls).toHaveBeenCalledOnce()
    expect(onLeaveControls).toHaveBeenCalledOnce()
    expect(onSettingsClick).toHaveBeenCalledOnce()
  })

  it('removes hidden controls from keyboard navigation until the runtime is ready', () => {
    render(
      <OverlayControlRail
        isDragging={false}
        isReady={false}
        isVisible
        placement={{}}
        backgroundColor={{ r: 0, g: 0, b: 0, a: 0 }}
        fontColor={{ r: 255, g: 255, b: 255, a: 1 }}
        onSettingsClick={() => {}}
        onPointerDown={() => {}}
        onKeyDown={() => {}}
        onEnterControls={() => {}}
        onLeaveControls={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'content.aria.openSettings' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'content.aria.dragToMove' })).toHaveAttribute('tabindex', '-1')
  })
})
