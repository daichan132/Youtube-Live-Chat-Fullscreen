import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAT_PANEL_LAYER } from '@/shared/constants/zIndex'
import { useYTDLiveChatNoLsStore, useYTDLiveChatStore } from '@/shared/stores'
import { ControlIcons } from './ControlIcons'

vi.mock('redux-persist-webextension-storage', () => ({
  localStorage: globalThis.localStorage,
}))

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

const renderControlIcons = ({ isDragging = false, isVisible = true, onSettingsClick = vi.fn(), onControlsHoverChange = vi.fn() } = {}) =>
  render(
    <ControlIcons
      controlRailStyle={{ top: 206, right: 0 }}
      dragProps={{
        attributes: {
          role: 'button',
          tabIndex: 0,
          'aria-disabled': false,
          'aria-pressed': false,
          'aria-roledescription': 'draggable',
          'aria-describedby': 'dnd-kit-desc',
        },
        listeners: undefined,
        isDragging,
      }}
      isVisible={isVisible}
      onControlsHoverChange={onControlsHoverChange}
      onSettingsClick={onSettingsClick}
    />,
  )

const getControlRail = (container: HTMLElement) => container.querySelector('[data-ylc-control-rail]') as HTMLElement
const getDragHandle = (container: HTMLElement) => container.querySelector('[aria-roledescription="drag handle"]') as HTMLElement
const getSettingsButtonElement = (container: HTMLElement) => container.querySelector('[data-ylc-settings-btn]') as HTMLButtonElement

describe('ControlIcons', () => {
  beforeEach(() => {
    localStorage.clear()
    useYTDLiveChatStore.setState({ alwaysOnDisplay: true })
    useYTDLiveChatNoLsStore.setState({ isDisplay: true, isIframeLoaded: false })
  })

  it('hides controls until the chat iframe is loaded', () => {
    const { container } = renderControlIcons()

    expect(getControlRail(container)).toHaveStyle({ opacity: '0', pointerEvents: 'none', top: '206px', right: '0px' })
    expect(getDragHandle(container)).toHaveAttribute('tabIndex', '-1')
    expect(getSettingsButtonElement(container)).toBeDisabled()
    expect(getSettingsButtonElement(container)).toHaveAttribute('tabIndex', '-1')
  })

  it('shows controls when the iframe is loaded and chat is visible', () => {
    useYTDLiveChatNoLsStore.setState({ isIframeLoaded: true, isDisplay: true })

    const { container } = renderControlIcons()

    expect(getControlRail(container)).toHaveStyle({
      opacity: '1',
      pointerEvents: 'auto',
      zIndex: String(CHAT_PANEL_LAYER.controls),
    })
    expect(getControlRail(container)).toHaveClass('ylc-overlay-control-rail')
    expect(getDragHandle(container)).toHaveAttribute('tabIndex', '0')
    expect(getSettingsButtonElement(container)).not.toBeDisabled()
    expect(getSettingsButtonElement(container)).toHaveAttribute('tabIndex', '0')
  })

  it('hides controls when the chat is not hovered even if chat display is active', () => {
    useYTDLiveChatNoLsStore.setState({ isIframeLoaded: true, isDisplay: true })

    const { container } = renderControlIcons({ isVisible: false })

    expect(getControlRail(container)).toHaveStyle({ opacity: '0', pointerEvents: 'none' })
    expect(getDragHandle(container)).toHaveAttribute('tabIndex', '-1')
    expect(getSettingsButtonElement(container)).toBeDisabled()
  })

  it('places the drag handle on the right side of the rail', () => {
    useYTDLiveChatNoLsStore.setState({ isIframeLoaded: true, isDisplay: true })

    const { container } = renderControlIcons()
    const railChildren = Array.from(getControlRail(container).children)

    expect(railChildren.at(0)?.querySelector('[data-ylc-settings-btn]')).not.toBeNull()
    expect(railChildren.at(1)?.matches('[aria-roledescription="drag handle"]')).toBe(true)
  })

  it('uses grabbing cursor styles while dragging', () => {
    useYTDLiveChatNoLsStore.setState({ isIframeLoaded: true, isDisplay: true })

    const { container } = renderControlIcons({ isDragging: true })
    const dragHandle = getDragHandle(container)

    expect(dragHandle).toHaveClass('cursor-grabbing')
    expect(dragHandle.firstElementChild).toHaveClass('cursor-grabbing')
    expect(dragHandle.firstElementChild).toHaveClass('ylc-overlay-control-icon-active')
  })

  it('keeps controls hidden when only always-on display keeps chat visible', () => {
    useYTDLiveChatStore.setState({ alwaysOnDisplay: true })
    useYTDLiveChatNoLsStore.setState({ isIframeLoaded: true, isDisplay: false })

    const { container } = renderControlIcons({ isVisible: false })

    expect(getControlRail(container)).toHaveStyle({ opacity: '0', pointerEvents: 'none' })
  })

  it('uses the configured chat colors for runtime controls', () => {
    useYTDLiveChatStore.setState({
      bgColor: { r: 1, g: 2, b: 3, a: 0.4 },
      fontColor: { r: 10, g: 20, b: 30, a: 0.6 },
    })
    useYTDLiveChatNoLsStore.setState({ isIframeLoaded: true, isDisplay: true })

    const { container } = renderControlIcons()
    const svg = container.querySelector('svg')

    expect(getControlRail(container).style.getPropertyValue('--ylc-overlay-control-rail-bg-runtime')).toBe('rgba(1, 2, 3, 0.4)')
    expect(getControlRail(container).style.getPropertyValue('--ylc-overlay-control-hover-runtime')).toBe('rgba(10, 20, 30, 0.1)')
    expect(getControlRail(container).style.color).toBe('rgba(10, 20, 30, 0.6)')
    expect(svg?.getAttribute('color')).toBe('rgba(10, 20, 30, 0.6)')
  })

  it('reports rail hover changes and keeps the settings click handler', () => {
    useYTDLiveChatNoLsStore.setState({ isIframeLoaded: true, isDisplay: true })
    const onControlsHoverChange = vi.fn()
    const onSettingsClick = vi.fn()

    const { container } = renderControlIcons({ onControlsHoverChange, onSettingsClick })
    fireEvent.mouseEnter(getControlRail(container))
    fireEvent.mouseLeave(getControlRail(container))
    fireEvent.click(getSettingsButtonElement(container))

    expect(onControlsHoverChange).toHaveBeenNthCalledWith(1, true)
    expect(onControlsHoverChange).toHaveBeenNthCalledWith(2, false)
    expect(onSettingsClick).toHaveBeenCalledTimes(1)
  })
})
