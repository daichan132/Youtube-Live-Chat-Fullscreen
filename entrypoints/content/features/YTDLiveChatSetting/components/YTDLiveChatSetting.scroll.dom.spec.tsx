import { fireEvent, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'jotai'
import { describe, expect, it, vi } from 'vitest'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { YTDLiveChatSetting } from './YTDLiveChatSetting'

const scrollTo = (element: HTMLElement, top: number) => {
  element.scrollTop = top
  fireEvent.scroll(element)
}

describe('settings tab scroll positions', () => {
  it('starts an unvisited tab at the top and restores each tab independently', () => {
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, createTestStore())
    scrollTo(view.getByRole('tabpanel'), 330)

    fireEvent.click(view.getByRole('tab', { name: 'content.setting.header.preset' }))
    expect(view.getByRole('tabpanel').scrollTop).toBe(0)
    scrollTo(view.getByRole('tabpanel'), 120)

    fireEvent.click(view.getByRole('tab', { name: 'content.setting.header.setting' }))
    expect(view.getByRole('tabpanel').scrollTop).toBe(330)
    fireEvent.click(view.getByRole('tab', { name: 'content.setting.header.preset' }))
    expect(view.getByRole('tabpanel').scrollTop).toBe(120)
  })

  it('restores tab positions during keyboard navigation without moving focus into the content', async () => {
    const user = userEvent.setup()
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={vi.fn()} />, createTestStore())
    scrollTo(view.getByRole('tabpanel'), 330)
    const settingsTab = view.getByRole('tab', { name: 'content.setting.header.setting' })
    settingsTab.focus()

    await user.keyboard('{ArrowRight}')
    expect(view.getByRole('tabpanel').scrollTop).toBe(0)
    expect(view.getByRole('tab', { name: 'content.setting.header.preset' })).toHaveFocus()
    scrollTo(view.getByRole('tabpanel'), 120)

    await user.keyboard('{ArrowLeft}')
    expect(view.getByRole('tabpanel').scrollTop).toBe(330)
    expect(settingsTab).toHaveFocus()
  })

  it('retains the current tab position when the settings dialog is closed and reopened', () => {
    const store = createTestStore()
    const onOpenChange = vi.fn()
    const setting = (open: boolean) => (
      <Provider store={store}>
        <YTDLiveChatSetting open={open} onOpenChange={onOpenChange} />
      </Provider>
    )
    const view = render(setting(true))
    scrollTo(view.getByRole('tabpanel'), 330)
    fireEvent.click(view.getByRole('tab', { name: 'content.setting.header.preset' }))
    scrollTo(view.getByRole('tabpanel'), 120)

    view.rerender(setting(false))
    view.rerender(setting(true))
    expect(view.getByRole('tabpanel').scrollTop).toBe(120)
    fireEvent.click(view.getByRole('tab', { name: 'content.setting.header.setting' }))
    expect(view.getByRole('tabpanel').scrollTop).toBe(330)
  })
})
