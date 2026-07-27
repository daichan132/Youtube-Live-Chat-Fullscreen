import { useAtomValue } from 'jotai'
import { type ReactNode, useId } from 'react'
import {
  type IconType,
  TbBlur,
  TbCoin,
  TbCrown,
  TbEye,
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
import { useT } from '@/shared/i18n/react'
import { effectiveProfileAtom } from '@/shared/state'
import { cn } from '@/shared/utils/cn'
import { useStyleHistoryCommands } from '../styleHistoryCommands'
import { FontFamilyInput } from './YLCChangeItems/FontFamilyInput'
import { YLCColorPicker } from './YLCChangeItems/YLCColorPicker'
import { YLCNumberSlider } from './YLCChangeItems/YLCNumberSlider'

type ToggleSettingKey = 'idleVisibility' | 'contentMode' | 'showUserName' | 'showUserIcon' | 'showSuperChatBar'

const SettingGroup = ({ legend, children }: { legend: string; children: ReactNode }) => (
  <fieldset className='ylc-setting-group'>
    <legend className='ylc-setting-group-legend'>{legend}</legend>
    {children}
  </fieldset>
)

const ControlRow = ({ icon: Icon, title, children }: { icon: IconType; title: string; children: ReactNode }) => (
  <div className='ylc-row'>
    <div className='ylc-row-label'>
      <span className='ylc-row-icon' aria-hidden='true'>
        <Icon size={19} />
      </span>
      <p className='ylc-row-title'>{title}</p>
    </div>
    <div className='ylc-row-action'>{children}</div>
  </div>
)

const ToggleRow = ({
  icon: Icon,
  title,
  hint,
  hintId,
  nested,
  disabled,
  children,
}: {
  icon: IconType
  title: string
  hint?: string
  hintId?: string
  nested?: boolean
  disabled?: boolean
  children: ReactNode
}) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: the toggle <input> control is supplied through the children prop
  <label className={cn('ylc-row', nested && 'ylc-row-nested', disabled && 'is-disabled')}>
    <span className='ylc-row-label'>
      <span className='ylc-row-icon' aria-hidden='true'>
        <Icon size={19} />
      </span>
      {hint ? (
        <span className='ylc-row-textcol'>
          <p className='ylc-row-title'>{title}</p>
          <span className='ylc-row-hint' id={hintId}>
            {hint}
          </span>
        </span>
      ) : (
        <p className='ylc-row-title'>{title}</p>
      )}
    </span>
    <span className='ylc-row-action ylc-row-action--auto'>{children}</span>
  </label>
)

const ToggleSettingSwitch = ({
  settingKey,
  label,
  disabled,
  describedById,
  onCheckedChange,
}: {
  settingKey: ToggleSettingKey
  label: string
  disabled?: boolean
  describedById?: string
  onCheckedChange?: (checked: boolean) => void
}) => {
  const id = useId()
  const profile = useAtomValue(effectiveProfileAtom)
  const { commitYLCStyleUpdate } = useStyleHistoryCommands()
  const checked =
    settingKey === 'idleVisibility'
      ? profile.display.idleVisibility === 'always-visible'
      : settingKey === 'contentMode'
        ? profile.display.contentMode === 'messages-only'
        : profile.appearance[settingKey]

  return (
    <Switch
      checked={checked}
      id={id}
      disabled={disabled}
      aria-label={label}
      aria-describedby={describedById}
      onChange={nextChecked => {
        onCheckedChange?.(nextChecked)
        if (settingKey === 'idleVisibility') {
          commitYLCStyleUpdate({ display: { idleVisibility: nextChecked ? 'always-visible' : 'auto-hide' } }, settingKey)
          return
        }
        if (settingKey === 'contentMode') {
          commitYLCStyleUpdate({ display: { contentMode: nextChecked ? 'messages-only' : 'full-chat' } }, settingKey)
          return
        }
        commitYLCStyleUpdate({ appearance: { [settingKey]: nextChecked } }, settingKey)
      }}
    />
  )
}

const DisplayToggleSettingSwitch = ({
  settingKey,
  label,
}: {
  settingKey: Extract<ToggleSettingKey, 'showUserName' | 'showUserIcon' | 'showSuperChatBar'>
  label: string
}) => {
  return <ToggleSettingSwitch settingKey={settingKey} label={label} />
}

const MembershipNameColorSetting = () => {
  const profile = useAtomValue(effectiveProfileAtom)
  const { commitYLCStyleUpdate } = useStyleHistoryCommands()
  const t = useT()
  const membershipNameColor = profile.appearance.membershipNameColor
  const isDefault = membershipNameColor.mode === 'youtube-default'

  const resetToDefault = () => {
    commitYLCStyleUpdate({ appearance: { membershipNameColor: { mode: 'youtube-default' } } }, 'membershipNameColor')
  }
  const resetLabel = t('content.setting.resetToDefaultColor')

  return (
    <div className='ylc-color-field'>
      <YLCColorPicker settingKey='membershipNameColor' labelKey='content.setting.membershipNameColor' />
      <span className='ylc-theme-tooltip' data-tooltip={resetLabel}>
        <button
          type='button'
          className='h-[36px] w-[36px] shrink-0 inline-flex items-center justify-center rounded-[8px] border border-solid ylc-theme-border ylc-theme-surface ylc-theme-text-secondary hover:text-[var(--ylc-text-primary)] hover:bg-[var(--ylc-hover-surface)] cursor-pointer transition-colors duration-160 ylc-theme-focus-ring disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--ylc-text-secondary)]'
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
  const t = useT()

  return (
    <>
      <SettingGroup legend={t('content.setting.group.display')}>
        <ToggleRow icon={TbEye} title={t('content.setting.alwaysOnDisplay')}>
          <ToggleSettingSwitch settingKey='idleVisibility' label={t('content.setting.alwaysOnDisplay')} />
        </ToggleRow>
        <ToggleRow icon={TbMessageCircle} title={t('content.setting.chatOnlyDisplay')}>
          <ToggleSettingSwitch settingKey='contentMode' label={t('content.setting.chatOnlyDisplay')} />
        </ToggleRow>
      </SettingGroup>

      <SettingGroup legend={t('content.setting.group.colors')}>
        <ControlRow icon={TbPaint} title={t('content.setting.backgroundColor')}>
          <YLCColorPicker settingKey='backgroundColor' labelKey='content.setting.backgroundColor' />
        </ControlRow>
        <ControlRow icon={TbPalette} title={t('content.setting.fontColor')}>
          <YLCColorPicker settingKey='fontColor' labelKey='content.setting.fontColor' />
        </ControlRow>
        <ControlRow icon={TbCrown} title={t('content.setting.membershipNameColor')}>
          <MembershipNameColorSetting />
        </ControlRow>
      </SettingGroup>

      <SettingGroup legend={t('content.setting.group.text')}>
        <ControlRow icon={TbTypography} title={t('content.setting.fontFamily')}>
          <FontFamilyInput />
        </ControlRow>
        <ControlRow icon={TbTextSize} title={t('content.setting.fontSize')}>
          <YLCNumberSlider settingKey='fontSize' labelKey='content.setting.fontSize' min={10} max={40} />
        </ControlRow>
        <ControlRow icon={TbBlur} title={t('content.setting.blur')}>
          <YLCNumberSlider settingKey='blur' labelKey='content.setting.blur' min={0} max={20} />
        </ControlRow>
        <ControlRow icon={TbSpacingHorizontal} title={t('content.setting.space')}>
          <YLCNumberSlider settingKey='spacing' labelKey='content.setting.space' min={0} max={40} />
        </ControlRow>
      </SettingGroup>

      <SettingGroup legend={t('content.setting.group.elements')}>
        <ToggleRow icon={TbUser} title={t('content.setting.userNameDisplay')}>
          <DisplayToggleSettingSwitch settingKey='showUserName' label={t('content.setting.userNameDisplay')} />
        </ToggleRow>
        <ToggleRow icon={TbUserCircle} title={t('content.setting.userIconDisplay')}>
          <DisplayToggleSettingSwitch settingKey='showUserIcon' label={t('content.setting.userIconDisplay')} />
        </ToggleRow>
        <ToggleRow icon={TbCoin} title={t('content.setting.superChatBarDisplay')}>
          <DisplayToggleSettingSwitch settingKey='showSuperChatBar' label={t('content.setting.superChatBarDisplay')} />
        </ToggleRow>
      </SettingGroup>
    </>
  )
}
