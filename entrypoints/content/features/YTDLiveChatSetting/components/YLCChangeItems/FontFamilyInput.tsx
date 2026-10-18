import { useAtomValue } from 'jotai'
import { type KeyboardEvent, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ensureFontLoaded } from '@/entrypoints/content/style/fontLoader'
import { TbCheck } from '@/shared/components/icons'
import { useShadowClickAway } from '@/shared/hooks/useShadowClickAway'
import { formatMessage } from '@/shared/i18n/format'
import { useT } from '@/shared/i18n/react'
import { effectiveAppearanceAtoms } from '@/shared/state'
import { cn } from '@/shared/utils/cn'
import { toQuotedFontFamily } from '@/shared/utils/fontFamilyFormat'
import { ALLOWED_FONT_FAMILIES, normalizeFontFamily } from '@/shared/utils/fontFamilyPolicy'
import { useStyleHistoryCommands } from '../../styleHistoryCommands'
import { getSettingScrollContainer, useEnsureSettingPanelVisibility } from './useEnsureSettingPanelVisibility'

const normalizeSearchValue = (value: string) => value.toLowerCase().replace(/\s+/g, '')
const PREVIEW_FALLBACK_FONT_FAMILY = 'Roboto, Arial, sans-serif'

const toFontFamilyStyleValue = (fontFamily: string) => `${toQuotedFontFamily(fontFamily)}, ${PREVIEW_FALLBACK_FONT_FAMILY}`

type FontFamilyOption = {
  value: string
  label: string
}

const FEATURED_FONT_VALUES = [
  'Roboto',
  'Noto Sans',
  'Noto Sans JP',
  'Zen Maru Gothic',
  'M PLUS 1p',
  'BIZ UDPGothic',
  'Open Sans',
  'Montserrat',
  'Poppins',
  'Inter',
] as const

const FEATURED_FONT_VALUE_SET = new Set<string>(FEATURED_FONT_VALUES)
const DEFAULT_FONT_OPTION: FontFamilyOption = {
  value: '',
  label: '',
}
const FONT_FAMILY_OPTIONS: FontFamilyOption[] = ALLOWED_FONT_FAMILIES.map(fontFamily => ({
  value: fontFamily,
  label: fontFamily,
}))

const buildFontFamilyOptions = (defaultLabel: string) => {
  const featuredOptions = FONT_FAMILY_OPTIONS.filter(option => FEATURED_FONT_VALUE_SET.has(option.value))
  const regularOptions = FONT_FAMILY_OPTIONS.filter(option => !FEATURED_FONT_VALUE_SET.has(option.value))

  return [{ ...DEFAULT_FONT_OPTION, label: defaultLabel }, ...featuredOptions, ...regularOptions]
}

export const FontFamilyInput = () => {
  const fontFamily = useAtomValue(effectiveAppearanceAtoms.fontFamily)
  const { commitYLCStyleUpdate } = useStyleHistoryCommands()

  const handleCommit = useCallback((nextFontFamily: string) => {
    commitYLCStyleUpdate({ appearance: { fontFamily: nextFontFamily || null } })
  }, [])

  return <FontFamilyInputUI value={fontFamily ?? ''} onCommit={handleCommit} />
}

const FontFamilyInputUI = ({ value, onCommit }: { value: string; onCommit: (fontFamily: string) => void }) => {
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuMaxHeight, setMenuMaxHeight] = useState<number>()
  const listboxId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const optionsRef = useRef<HTMLDivElement>(null)
  const activeOptionRef = useRef<HTMLButtonElement>(null)
  useEnsureSettingPanelVisibility({ isOpen, anchorRef: triggerRef, popupRef: menuRef })

  const defaultLabel = t('content.setting.fontFamilyDefault')
  const normalizedValue = useMemo(() => normalizeFontFamily(value), [value])
  const options = useMemo(() => buildFontFamilyOptions(defaultLabel), [defaultLabel])
  const optionIds = useMemo(
    () => new Map(options.map((option, index) => [option.value, `${listboxId}-option-${index}`])),
    [listboxId, options],
  )
  const selectedOption = useMemo(() => options.find(option => option.value === normalizedValue), [normalizedValue, options])
  const displayLabel = selectedOption?.label ?? defaultLabel
  const filteredOptions = useMemo(() => {
    const normalizedSearchValue = normalizeSearchValue(searchValue)
    if (!normalizedSearchValue) {
      return options
    }
    return options.filter(option => normalizeSearchValue(option.label).includes(normalizedSearchValue))
  }, [options, searchValue])
  const activeOption = filteredOptions[activeIndex]
  const activeOptionId = activeOption ? optionIds.get(activeOption.value) : undefined

  useLayoutEffect(() => {
    if (!isOpen) return
    const anchor = triggerRef.current
    const container = getSettingScrollContainer(anchor)
    const updateHeight = () => {
      const height = container?.clientHeight ?? window.innerHeight
      const anchorHeight = anchor?.getBoundingClientRect().height ?? 0
      // Reserve the trigger, popup gap and the scroll container's safe margins.
      setMenuMaxHeight(Math.max(90, Math.floor(height - anchorHeight - 22)))
    }
    updateHeight()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateHeight)
    if (container) observer?.observe(container)
    window.addEventListener('resize', updateHeight, { passive: true })
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen) return
    const list = optionsRef.current
    const option = activeOptionRef.current
    if (!list || !option) return
    const bounds = list.getBoundingClientRect()
    const activeBounds = option.getBoundingClientRect()
    if (activeBounds.top < bounds.top) list.scrollTop += activeBounds.top - bounds.top
    else if (activeBounds.bottom > bounds.bottom) list.scrollTop += activeBounds.bottom - bounds.bottom
  }, [activeIndex, filteredOptions, isOpen, menuMaxHeight])

  useEffect(() => {
    ensureFontLoaded(document, normalizedValue, 'ylc-selected-font-preview-style')
  }, [normalizedValue])

  useEffect(() => {
    if (!isOpen) return
    const selectedIndex = filteredOptions.findIndex(option => option.value === normalizedValue)
    if (selectedIndex >= 0) {
      setActiveIndex(selectedIndex)
      return
    }
    setActiveIndex(filteredOptions.length > 0 ? 0 : -1)
  }, [filteredOptions, isOpen, normalizedValue])

  useEffect(() => {
    if (!isOpen) return
    const id = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    })
    return () => {
      window.cancelAnimationFrame(id)
    }
  }, [isOpen])

  const closeMenu = useCallback((returnFocus = false) => {
    setIsOpen(false)
    setSearchValue('')
    if (returnFocus) triggerRef.current?.focus({ preventScroll: true })
  }, [])
  useShadowClickAway(rootRef, () => closeMenu())

  const commitFontFamily = useCallback(
    (nextFontFamily: string) => {
      const normalizedFontFamily = normalizeFontFamily(nextFontFamily)
      closeMenu(true)
      if (normalizedFontFamily === normalizedValue) return
      onCommit(normalizedFontFamily)
    },
    [closeMenu, normalizedValue, onCommit],
  )

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (!filteredOptions.length) return
        setActiveIndex(prev => {
          if (prev < 0) return 0
          return (prev + 1) % filteredOptions.length
        })
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (!filteredOptions.length) return
        setActiveIndex(prev => {
          if (prev < 0) return filteredOptions.length - 1
          return prev === 0 ? filteredOptions.length - 1 : prev - 1
        })
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        const activeOption = activeIndex >= 0 ? filteredOptions[activeIndex] : undefined
        if (activeOption) {
          commitFontFamily(activeOption.value)
        }
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        closeMenu(true)
      }
    },
    [activeIndex, closeMenu, commitFontFamily, filteredOptions],
  )

  const handleToggleMenu = useCallback(() => {
    setSearchValue('')
    setIsOpen(prev => !prev)
  }, [])

  const currentValue = displayLabel || defaultLabel

  return (
    <div className='ylc-font-combobox ylc-action-fill' ref={rootRef} data-ylc-font-combobox='true'>
      <button
        ref={triggerRef}
        type='button'
        className='ylc-font-combobox-trigger ylc-action-fill ylc-theme-focus-ring'
        onClick={handleToggleMenu}
        aria-label={t('content.setting.fontFamily')}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        data-ylc-font-combobox-trigger='true'
      >
        <span
          className='ylc-font-combobox-trigger-text'
          style={normalizedValue ? { fontFamily: toFontFamilyStyleValue(normalizedValue) } : undefined}
        >
          {currentValue}
        </span>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className='ylc-font-combobox-menu ylc-theme-shadow-sm ylc-theme-border'
          style={{ maxHeight: menuMaxHeight }}
          data-ylc-font-combobox-menu='true'
        >
          <input
            ref={searchInputRef}
            className='ylc-font-combobox-search'
            style={{ flexShrink: 0 }}
            value={searchValue}
            onChange={event => setSearchValue(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={event => {
              if (!(event.relatedTarget instanceof Node) || !rootRef.current?.contains(event.relatedTarget)) closeMenu()
            }}
            placeholder={t('content.setting.fontSearch')}
            role='combobox'
            aria-expanded={isOpen}
            aria-autocomplete='list'
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            aria-label={t('content.setting.fontSearch')}
            data-ylc-font-combobox-search='true'
            data-testid='font-family-search'
          />
          <span aria-live='polite' className='ylc-visually-hidden'>
            {formatMessage(t('content.aria.fontsFound'), { count: filteredOptions.length })}
          </span>
          <div
            ref={optionsRef}
            className='ylc-font-combobox-options'
            style={{ minHeight: 0 }}
            role='listbox'
            tabIndex={-1}
            id={listboxId}
            aria-live='polite'
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === normalizedValue
                const isActive = index === activeIndex
                return (
                  <button
                    key={option.value || '__default'}
                    ref={isActive ? activeOptionRef : undefined}
                    id={optionIds.get(option.value)}
                    type='button'
                    role='option'
                    tabIndex={-1}
                    aria-selected={isSelected}
                    className={cn(
                      'ylc-font-combobox-option ylc-theme-focus-ring-soft',
                      isActive && 'ylc-font-combobox-option-active',
                      isSelected && 'ylc-font-combobox-option-selected',
                    )}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => commitFontFamily(option.value)}
                  >
                    <span className='ylc-font-combobox-option-label'>{option.label}</span>
                    {isSelected && <TbCheck size={16} aria-hidden='true' />}
                  </button>
                )
              })
            ) : (
              <div className='ylc-font-combobox-empty ylc-theme-text-muted'>{t('content.setting.fontNotFound')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
