import { expect, test } from '@e2e/fixtures'
import { ExtensionOverlay } from '@e2e/pages/ExtensionOverlay'
import { YouTubeScenario, type YouTubeScenarioState } from '@e2e/support/youtubeScenario'
import { setRangeWithKeyboard } from '@e2e/utils/rangeInput'
import { patchOverlayStore } from '@e2e/utils/storageHelper'
import type { ChatProfile, RGBA } from '../../../shared/settings/model'
import { APPEARANCE_STORAGE_KEY } from '../../../shared/settings/storageKeys'

const state = {
  video: { id: 'settings-application', title: 'Settings application fixture', mode: 'live' },
  page: { chatContainer: 'present', chatDimensions: 'standard' },
  fullscreen: false,
  chat: { mode: 'live', native: { state: 'playable' }, response: 'playable', purchaseInteractions: true },
} satisfies YouTubeScenarioState

const cssColor = ({ r, g, b, a }: RGBA) => (a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`)

test(
  'applies every appearance control from settings to the chat and persists the result',
  { tag: '@fixture' },
  async ({ page, extension }, testInfo) => {
    test.setTimeout(90000)
    await patchOverlayStore(extension, {
      profile: {
        appearance: {
          backgroundColor: { r: 12, g: 24, b: 36, a: 0.4 },
          fontColor: { r: 240, g: 220, b: 200, a: 1 },
          membershipNameColor: { mode: 'youtube-default' },
          fontFamily: null,
          blur: 0,
          spacing: 0,
          textShadow: 0,
          showUserName: true,
          showUserIcon: true,
          showSuperChatBar: true,
        },
        display: { idleVisibility: 'always-visible', contentMode: 'full-chat' },
      },
    })
    const scenario = new YouTubeScenario(page)
    const overlay = new ExtensionOverlay(page)
    await scenario.load(state)
    await scenario.enterFullscreen()
    await overlay.expectChatLoaded({ timeout: 12000 })
    await overlay.installChatTypographyProbe()
    const chat = page.frameLocator('iframe[data-ylc-chat]')
    const message = chat.locator('[data-ylc-preview-message]')
    await message.evaluate(element => {
      const document = element.ownerDocument
      document.querySelector('#items')?.prepend(element)
      element.querySelector('yt-live-chat-author-chip')?.classList.add('yt-live-chat-text-message-renderer')
      element.querySelector('#author-name')?.classList.add('member')
      element.insertAdjacentHTML('afterbegin', '<span id="author-photo" class="yt-live-chat-text-message-renderer">Avatar</span>')
      document
        .querySelector('yt-live-chat-renderer')
        ?.insertAdjacentHTML(
          'afterbegin',
          '<div id="ticker"><yt-live-chat-ticker-renderer>Super Chat bar</yt-live-chat-ticker-renderer></div>',
        )
      const nativeStyle = document.createElement('style')
      nativeStyle.textContent = ':root { --yt-live-chat-sponsor-color: rgb(15, 157, 88); } body { font-family: Arial, sans-serif; }'
      document.head.append(nativeStyle)
    })
    const readAppearance = async () => {
      const stored = await extension.storage.get([APPEARANCE_STORAGE_KEY])
      return (stored[APPEARANCE_STORAGE_KEY] as { value: { profile: ChatProfile } }).value.profile.appearance
    }
    await overlay.openSettings()
    const settings = overlay.settingsFrame()
    for (const [label, key, target] of [
      ['Background Color', 'backgroundColor', page.locator('[data-ylc-chat-background]')],
      ['Text Color', 'fontColor', message.locator('#message')],
      ['Member Name Color', 'membershipNameColor', message.locator('#author-name')],
    ] as const) {
      const before = (await readAppearance())[key]
      await settings.getByRole('button', { name: new RegExp(`^${label}`) }).click()
      const picker = settings.getByRole('dialog', { name: 'Color picker', exact: true })
      await picker.getByRole('slider', { name: 'Color', exact: true }).press('ArrowDown')
      await picker.getByRole('slider', { name: 'Hue', exact: true }).press('ArrowRight')
      if (key === 'backgroundColor') await picker.getByRole('slider', { name: 'Alpha', exact: true }).press('ArrowLeft')
      await page.keyboard.press('Escape')
      await expect.poll(async () => (await readAppearance())[key]).not.toEqual(before)
      const color = (await readAppearance())[key]
      const rgba = 'mode' in color ? (color.mode === 'custom' ? color.value : null) : color
      if (!rgba) throw new Error('Expected a saved custom color')
      await expect(target).toHaveCSS(key === 'backgroundColor' ? 'background-color' : 'color', cssColor(rgba))
    }
    await settings.getByRole('button', { name: 'Reset to default color', exact: true }).click()
    await expect(message.locator('#author-name')).toHaveCSS('color', 'rgb(15, 157, 88)')

    await settings.getByRole('button', { name: /^Font / }).click()
    const search = settings.getByRole('combobox', { name: 'Search fonts', exact: true })
    await search.fill('Roboto Slab')
    await search.press('Enter')
    await expect(message.locator('#message')).toHaveCSS('font-family', '"Roboto Slab", Roboto, Arial, sans-serif')
    await settings.getByRole('button', { name: /^Font / }).click()
    await settings.getByRole('option', { name: 'Default', exact: true }).click()
    await expect(message.locator('#message')).toHaveCSS('font-family', 'Roboto, Arial, sans-serif')

    for (const [label, value] of [
      ['Blur', '8'],
      ['Message Spacing', '16'],
    ] as const) {
      const input = settings.getByRole('slider', { name: label, exact: true })
      await setRangeWithKeyboard(input, Number(value))
    }
    await expect(page.locator('[data-ylc-chat-background]')).toHaveCSS('backdrop-filter', 'blur(8px)')
    await expect(chat.locator('body')).toHaveCSS('backdrop-filter', 'blur(8px)')
    await expect(message).toHaveCSS('margin-top', '16px')
    await expect(message).toHaveCSS('margin-bottom', '16px')
    const shadow = settings.getByRole('slider', { name: 'Text Shadow', exact: true })
    await setRangeWithKeyboard(shadow, 50)
    await expect(message.locator('#message')).toHaveCSS('text-shadow', 'rgba(0, 0, 0, 0.45) 0px 1px 3px, rgba(0, 0, 0, 0.4) 0px 0px 2px')
    await setRangeWithKeyboard(shadow, 0)
    await expect(message.locator('#message')).toHaveCSS('text-shadow', 'none')
    for (const [label, target] of [
      ['Show Usernames', message.locator('yt-live-chat-author-chip')],
      ['Show Profile Pictures', message.locator('#author-photo')],
      ['Show Super Chat Bar', chat.locator('yt-live-chat-ticker-renderer')],
    ] as const) {
      const toggle = settings.getByRole('switch', { name: label, exact: true })
      await toggle.uncheck()
      await expect(target).toBeHidden()
      await expect(message.locator('#message')).toBeVisible()
      await toggle.check()
      await expect(target).toBeVisible()
    }
    const finalAppearance = await readAppearance()
    await settings.getByRole('button', { name: 'Close', exact: true }).click()
    const screenshot = testInfo.outputPath('customized-chat.png')
    await page.screenshot({ path: screenshot })
    await testInfo.attach('customized-chat', { path: screenshot, contentType: 'image/png' })
    await overlay.openSettings()
    await expect(settings.getByRole('slider', { name: 'Blur', exact: true })).toHaveValue('8')
    await expect(settings.getByRole('slider', { name: 'Message Spacing', exact: true })).toHaveValue('16')
    expect(await readAppearance()).toEqual(finalAppearance)
    await settings.getByRole('button', { name: 'Close', exact: true }).click()
    await scenario.exitFullscreen()
    await overlay.expectChatDetached({ timeout: 12000 })
    const nativeChat = page.frameLocator('iframe#chatframe')
    await expect(nativeChat.locator('body')).toHaveCSS('font-family', 'Arial, sans-serif')
    await expect(nativeChat.locator('[data-ylc-preview-message]')).toHaveCSS('margin-top', '0px')
  },
)
