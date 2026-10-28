import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { chatSettingsStateAtom, editorSessionStateAtom } from '@/shared/state/atoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { YTDLiveChatSetting } from '../YTDLiveChatSetting'

describe('settings popover Escape ownership', () => {
  it.each(['trigger', 'slider'])('closes only the color picker from its %s and returns focus to its trigger', focus => {
    const onOpenChange = vi.fn()
    const store = createTestStore()
    const before = store.get(chatSettingsStateAtom).profile
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={onOpenChange} />, store)
    const trigger = view.getByRole('button', { name: 'content.setting.backgroundColor' })
    fireEvent.click(trigger)
    const target = focus === 'slider' ? view.getByRole('slider', { name: 'Hue' }) : trigger
    target.focus()

    fireEvent.keyDown(target, { key: 'Escape', isComposing: true })
    expect(view.getByRole('dialog', { name: 'content.aria.colorPicker' })).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()

    fireEvent.keyDown(target, { key: 'Escape' })

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(view.queryByRole('dialog', { name: 'content.aria.colorPicker' })).not.toBeInTheDocument()
    expect(view.getByRole('dialog', { name: 'content.setting.header.setting' })).toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(store.get(chatSettingsStateAtom).profile).toEqual(before)
    expect(store.get(editorSessionStateAtom).past).toEqual([])

    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('lets the font search consume Escape before the settings dialog', () => {
    const onOpenChange = vi.fn()
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={onOpenChange} />, createTestStore())
    fireEvent.click(view.getByRole('button', { name: 'content.setting.fontFamily' }))

    fireEvent.keyDown(view.getByRole('combobox'), { key: 'Escape' })

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(view.queryByRole('combobox')).not.toBeInTheDocument()
    expect(view.getByRole('dialog', { name: 'content.setting.header.setting' })).toBeInTheDocument()
  })

  it('keeps Escape in the picker when a click does not focus its trigger', () => {
    const onOpenChange = vi.fn()
    const view = renderWithStore(<YTDLiveChatSetting open onOpenChange={onOpenChange} />, createTestStore())
    const trigger = view.getByRole('button', { name: 'content.setting.backgroundColor' })
    const otherControl = view.getByRole('button', { name: 'content.setting.fontFamily' })
    otherControl.focus()

    // Native click focus differs between browsers and user preferences.
    fireEvent.click(trigger)
    expect(trigger).toHaveFocus()
    fireEvent.keyDown(document.activeElement ?? document, { key: 'Escape' })

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(view.queryByRole('dialog', { name: 'content.aria.colorPicker' })).not.toBeInTheDocument()
    expect(view.getByRole('dialog', { name: 'content.setting.header.setting' })).toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
