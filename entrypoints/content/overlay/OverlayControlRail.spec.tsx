import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_MESSAGES, localeStateAtom, localeStateFromMessages } from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { OverlayControlRail } from './OverlayControlRail'

describe('OverlayControlRail', () => {
  it('preserves semantic settings and drag controls inside an RTL surface', () => {
    const onSettingsClick = vi.fn()
    const onEnterControls = vi.fn()
    const onLeaveControls = vi.fn()

    const store = createTestStore()
    store.set(localeStateAtom, localeStateFromMessages('ar', EMPTY_MESSAGES))
    renderWithStore(
      <div dir='ltr'>
        <OverlayControlRail
          isDragging={false}
          isReady
          isVisible
          placement={{ top: 20, right: 0 }}
          onSettingsClick={onSettingsClick}
          onPointerDown={() => {}}
          onKeyDown={() => {}}
          onEnterControls={onEnterControls}
          onLeaveControls={onLeaveControls}
        />
      </div>,
      store,
    )

    const settingsButton = screen.getByRole('button', { name: 'content.aria.openSettings' })
    const dragHandle = screen.getByRole('button', { name: 'content.aria.dragToMove' })
    const rail = settingsButton.closest('[data-ylc-control-rail]') as HTMLElement

    expect(rail).toHaveAttribute('lang', 'ar')
    expect(rail).toHaveAttribute('dir', 'rtl')
    expect(dragHandle).toHaveAttribute('aria-roledescription', 'content.aria.dragHandle')
    expect(dragHandle).toHaveAttribute('data-ylc-drag-handle')
    expect(dragHandle).toHaveAccessibleDescription('content.aria.arrowKeysToMove')

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
