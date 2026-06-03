import { Fragment, type ReactNode, useId } from 'react'
import { useTranslation } from 'react-i18next'
import {
  changeYLCBgColor,
  changeYLCBlur,
  changeYLCFontColor,
  changeYLCMembershipNameColor,
  getYLCStandardMembershipNameColor,
  isFallbackMembershipNameColor,
  setYLCStyleProperty,
} from '@/entrypoints/content/hooks/ylcStyleChange/ylcStyleApplier'
import {
  YLC_FONT_SIZE_PROPERTY,
  YLC_SPACING_PROPERTY,
  YLC_SUPER_CHAT_BAR_DISPLAY_PROPERTY,
  YLC_USER_ICON_DISPLAY_PROPERTY,
  YLC_USER_NAME_DISPLAY_PROPERTY,
} from '@/entrypoints/content/hooks/ylcStyleChange/ylcStyleConstants'
import {
  type IconType,
  TbBlur,
  TbClock,
  TbCrown,
  TbMessageCircle,
  TbPaint,
  TbPalette,
  TbReset,
  TbSpacingHorizontal,
  TbTextSize,
  TbTypography,
  TbUser,
  TbUserCircle,
} from '@/shared/components/icons'
import { Switch } from '@/shared/components/Switch'
import { useYTDLiveChatStore } from '@/shared/stores'
import type { RGBColor, YLCStyleUpdateType } from '@/shared/types/ytdLiveChatType'
import { cn } from '@/shared/utils/cn'
import { FontFamilyInput } from './YLCChangeItems/FontFamilyInput'
import { YLCColorPicker } from './YLCChangeItems/YLCColorPicker'
import { YLCNumberSlider } from './YLCChangeItems/YLCNumberSlider'

type SettingItem = {
  id: string
  icon: IconType
  title: string
  data: ReactNode
  disable?: boolean
}

type ToggleSettingKey = 'alwaysOnDisplay' | 'chatOnlyDisplay' | 'userNameDisplay' | 'userIconDisplay' | 'superChatBarDisplay'
type VisibleDisplayValue = 'inline' | 'block'

const isSameColor = (a: RGBColor, b: RGBColor) => a.r === b.r && a.g === b.g && a.b === b.b && (a.a ?? 1) === (b.a ?? 1)

const isDefaultMembershipNameColor = (color: RGBColor) =>
  isFallbackMembershipNameColor(color) || isSameColor(color, getYLCStandardMembershipNameColor())

const applyFontSize = (fontSize: number) => setYLCStyleProperty(YLC_FONT_SIZE_PROPERTY, `${fontSize}px`)
const applySpace = (space: number) => setYLCStyleProperty(YLC_SPACING_PROPERTY, `${space}px`)

const ToggleSettingSwitch = ({
  settingKey,
  label,
  onCheckedChange,
}: {
  settingKey: ToggleSettingKey
  label: string
  onCheckedChange?: (checked: boolean) => void
}) => {
  const id = useId()
  const checked = useYTDLiveChatStore(state => state[settingKey])
  const updateYLCStyle = useYTDLiveChatStore(state => state.updateYLCStyle)

  return (
    <Switch
      checked={checked}
      id={id}
      aria-label={label}
      onChange={nextChecked => {
        onCheckedChange?.(nextChecked)
        updateYLCStyle({ [settingKey]: nextChecked } as YLCStyleUpdateType)
      }}
    />
  )
}

const DisplayToggleSettingSwitch = ({
  settingKey,
  label,
  cssVariable,
  visibleDisplay = 'inline',
}: {
  settingKey: Extract<ToggleSettingKey, 'userNameDisplay' | 'userIconDisplay' | 'superChatBarDisplay'>
  label: string
  cssVariable: string
  visibleDisplay?: VisibleDisplayValue
}) => {
  return (
    <ToggleSettingSwitch
      settingKey={settingKey}
      label={label}
      onCheckedChange={checked => setYLCStyleProperty(cssVariable, checked ? visibleDisplay : 'none')}
    />
  )
}

const MembershipNameColorSetting = () => {
  const { t } = useTranslation()
  const membershipNameColor = useYTDLiveChatStore(state => state.membershipNameColor)
  const updateYLCStyle = useYTDLiveChatStore(state => state.updateYLCStyle)
  const isDefault = isDefaultMembershipNameColor(membershipNameColor)

  const resetToDefault = () => {
    const defaultColor = getYLCStandardMembershipNameColor()
    changeYLCMembershipNameColor(defaultColor)
    updateYLCStyle({ membershipNameColor: defaultColor })
  }
  const resetLabel = t('content.setting.resetToDefaultColor')

  return (
    <div className='flex items-center justify-end gap-2 ylc-action-fill'>
      <YLCColorPicker
        settingKey='membershipNameColor'
        labelKey='content.setting.membershipNameColor'
        applyColor={changeYLCMembershipNameColor}
      />
      <span className='ylc-theme-tooltip' data-tooltip={resetLabel}>
        <button
          type='button'
          className='h-[36px] w-[36px] shrink-0 inline-flex items-center justify-center rounded-[10px] border border-solid ylc-theme-border ylc-theme-surface ylc-theme-text-secondary hover:text-[var(--ylc-text-primary)] hover:bg-[var(--ylc-hover-surface)] cursor-pointer transition-colors duration-160 ylc-theme-focus-ring-soft disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--ylc-text-secondary)]'
          onClick={resetToDefault}
          disabled={isDefault}
          aria-label={resetLabel}
        >
          <TbReset size={18} />
        </button>
      </span>
    </div>
  )
}

export const SettingContent = () => {
  const alwaysOnDisplay = useYTDLiveChatStore(state => state.alwaysOnDisplay)
  const { t } = useTranslation()
  const items: SettingItem[] = [
    {
      id: 'alwaysOnDisplay',
      icon: TbClock,
      title: t('content.setting.alwaysOnDisplay'),
      data: <ToggleSettingSwitch settingKey='alwaysOnDisplay' label={t('content.setting.alwaysOnDisplay')} />,
    },
    {
      id: 'chatOnlyDisplay',
      icon: TbMessageCircle,
      title: t('content.setting.chatOnlyDisplay'),
      data: <ToggleSettingSwitch settingKey='chatOnlyDisplay' label={t('content.setting.chatOnlyDisplay')} />,
      disable: !alwaysOnDisplay,
    },
    {
      id: 'backgroundColor',
      icon: TbPaint,
      title: t('content.setting.backgroundColor'),
      data: <YLCColorPicker settingKey='bgColor' labelKey='content.setting.backgroundColor' applyColor={changeYLCBgColor} />,
    },
    {
      id: 'fontColor',
      icon: TbPalette,
      title: t('content.setting.fontColor'),
      data: <YLCColorPicker settingKey='fontColor' labelKey='content.setting.fontColor' applyColor={changeYLCFontColor} />,
    },
    {
      id: 'membershipNameColor',
      icon: TbUser,
      title: t('content.setting.membershipNameColor'),
      data: <MembershipNameColorSetting />,
    },
    { id: 'fontFamily', icon: TbTypography, title: t('content.setting.fontFamily'), data: <FontFamilyInput /> },
    {
      id: 'fontSize',
      icon: TbTextSize,
      title: t('content.setting.fontSize'),
      data: <YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} applyValue={applyFontSize} />,
    },
    {
      id: 'blur',
      icon: TbBlur,
      title: t('content.setting.blur'),
      data: <YLCNumberSlider settingKey='blur' labelKey='content.setting.blur' min={0} max={20} applyValue={changeYLCBlur} />,
    },
    {
      id: 'space',
      icon: TbSpacingHorizontal,
      title: t('content.setting.space'),
      data: <YLCNumberSlider settingKey='space' labelKey='content.setting.space' min={0} max={40} applyValue={applySpace} />,
    },
    {
      id: 'userNameDisplay',
      icon: TbUser,
      title: t('content.setting.userNameDisplay'),
      data: (
        <DisplayToggleSettingSwitch
          settingKey='userNameDisplay'
          label={t('content.setting.userNameDisplay')}
          cssVariable={YLC_USER_NAME_DISPLAY_PROPERTY}
        />
      ),
    },
    {
      id: 'userIconDisplay',
      icon: TbUserCircle,
      title: t('content.setting.userIconDisplay'),
      data: (
        <DisplayToggleSettingSwitch
          settingKey='userIconDisplay'
          label={t('content.setting.userIconDisplay')}
          cssVariable={YLC_USER_ICON_DISPLAY_PROPERTY}
        />
      ),
    },
    {
      id: 'superChatBarDisplay',
      icon: TbCrown,
      title: t('content.setting.superChatBarDisplay'),
      data: (
        <DisplayToggleSettingSwitch
          settingKey='superChatBarDisplay'
          label={t('content.setting.superChatBarDisplay')}
          cssVariable={YLC_SUPER_CHAT_BAR_DISPLAY_PROPERTY}
          visibleDisplay='block'
        />
      ),
    },
  ]

  return (
    <>
      {items.map((item, i) => (
        <Fragment key={item.id}>
          <div
            className={cn(
              'flex flex-wrap justify-between items-center transition-all duration-160 opacity-100 ylc-theme-text-primary',
              !item.disable && 'px-3 py-2 rounded-lg',
              item.disable && 'h-0 py-0 px-3 opacity-0 pointer-events-none overflow-hidden',
            )}
          >
            <div className='flex items-center'>
              <span className='mr-3 ylc-theme-icon-badge' aria-hidden='true'>
                <item.icon size={18} />
              </span>
              <p className='ylc-theme-text-primary'>{item.title}</p>
            </div>
            <div className='ylc-action-slot ylc-action-slot-setting'>
              <div className='ylc-action-inner'>{item.data}</div>
            </div>
          </div>
          {!item.disable && i < items.length - 1 && <hr className='border-none ylc-theme-divider' />}
        </Fragment>
      ))}
    </>
  )
}
