import type { Meta, StoryObj } from '@storybook/react-vite'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BiDonateHeart } from 'react-icons/bi'
import { MdChatBubbleOutline, MdLanguage, MdLink } from 'react-icons/md'
import { LanguageSelector } from '@/entrypoints/popup/components/LanguageSelector'
import { Links } from '@/entrypoints/popup/components/Links'
import { PopupItemRow } from '@/entrypoints/popup/components/PopupItemRow'
import { YTDLiveChatSwitch } from '@/entrypoints/popup/components/YTDLiveChatSwitch'
import { useGlobalSettingStore } from '@/shared/stores'

type PopupComponentsStoryProps = {
  ytdLiveChatEnabled: boolean
}

const PopupComponentsPreview = ({ ytdLiveChatEnabled }: PopupComponentsStoryProps) => {
  const { t } = useTranslation()

  useEffect(() => {
    useGlobalSettingStore.setState({ ytdLiveChat: ytdLiveChatEnabled })
  }, [ytdLiveChatEnabled])

  return (
    <div className='w-[450px] rounded-md overflow-hidden shadow-lg bg-gray-100 py-2'>
      <PopupItemRow icon={MdLanguage} title={t('popup.language')} data={<LanguageSelector />} isLast={false} />
      <PopupItemRow icon={MdChatBubbleOutline} title={t('popup.showChatOnFullscreen')} data={<YTDLiveChatSwitch />} isLast={false} />
      <PopupItemRow icon={MdLink} title={t('popup.links')} data={<Links />} isLast={false} />
      <PopupItemRow
        icon={BiDonateHeart}
        title={t('popup.donate')}
        data={
          <a href='https://ko-fi.com/D1D01A39U6' target='_blank' rel='noreferrer'>
            <img
              height='36'
              style={{ border: '0px', height: '36px' }}
              src='https://storage.ko-fi.com/cdn/kofi1.png?v=6'
              alt='Buy Me a Coffee at ko-fi.com'
            />
          </a>
        }
        isLast={true}
      />
    </div>
  )
}

const meta = {
  title: 'Popup/Components',
  component: PopupComponentsPreview,
  tags: ['autodocs'],
  args: {
    ytdLiveChatEnabled: true,
  },
  argTypes: {
    ytdLiveChatEnabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof PopupComponentsPreview>

export default meta
type Story = StoryObj<typeof meta>

export const Gallery: Story = {}
