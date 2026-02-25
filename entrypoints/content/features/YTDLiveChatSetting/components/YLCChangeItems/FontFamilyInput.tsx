import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useYLCFontFamilyChange } from '@/entrypoints/content/hooks/ylcStyleChange/useYLCFontFamilyChange'
import { TbCheck } from '@/shared/components/icons'
import { useShadowClickAway } from '@/shared/hooks/useShadowClickAway'
import { useYTDLiveChatStore } from '@/shared/stores'
import { cn } from '@/shared/utils/cn'
import { normalizeFontFamily } from '@/shared/utils/fontFamilyPolicy'
import { DEFAULT_FONT_OPTION, FEATURED_FONT_VALUES, FONT_FAMILY_OPTIONS } from './fontFamilyOptions'
import { useEnsureSettingPanelVisibility } from './useEnsureSettingPanelVisibility'

const normalizeSearchValue = (value: string) => value.toLowerCase().replace(/\s+/g, '')
const PREVIEW_FONT_STYLE_ID = 'ylc-font-family-preview-style'
const PREVIEW_FALLBACK_FONT_FAMILY = 'Roboto, Arial, sans-serif'

const toGoogleFontFamilyParam = (fontFamily: string) => encodeURIComponent(fontFamily.trim()).replace(/%20/g, '+')

const toQuotedFontFamily = (fontFamily: string) => `"${fontFamily.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

const toFontFamilyStyleValue = (fontFamily: string) => `${toQuotedFontFamily(fontFamily)}, ${PREVIEW_FALLBACK_FONT_FAMILY}`

const FEATURED_FONT_VALUE_SET = new Set<string>(FEATURED_FONT_VALUES)

const buildFontFamilyOptions = (defaultLabel: string) => {
  const featuredOptions = FONT_FAMILY_OPTIONS.filter(option => FEATURED_FONT_VALUE_SET.has(option.value))
  const regularOptions = FONT_FAMILY_OPTIONS.filter(option => !FEATURED_FONT_VALUE_SET.has(option.value))

  return [{ ...DEFAULT_FONT_OPTION, label: defaultLabel, featured: true }, ...featuredOptions, ...regularOptions]
}

const buildPreviewImportStyles = () =>
  FONT_FAMILY_OPTIONS.map(
    option => `@import url('https://fonts.googleapis.com/css2?family=${toGoogleFontFamilyParam(option.value)}&display=swap');`,
  ).join('\n')

export const FontFamilyInput = () => {
  const { changeFontFamily } = useYLCFontFamilyChange()
  const { fontFamily, updateYLCStyle } = useYTDLiveChatStore(
    useShallow(state => ({
      fontFamily: state.fontFamily,
      updateYLCStyle: state.updateYLCStyle,
    })),
  )

  const handleCommit = useCallback(
    (nextFontFamily: string) => {
      updateYLCStyle({ fontFamily: nextFontFamily })
      changeFontFamily(nextFontFamily)
    },
    [changeFontFamily, updateYLCStyle],
  )

  return <FontFamilyInputUI value={fontFamily} onCommit={handleCommit} />
}

export const FontFamilyInputUI = ({
  value,
  onCommit,
  readOnly = false,
}: {
  value: string
  onCommit?: (fontFamily: string) => void
  readOnly?: boolean
}) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  useEnsureSettingPanelVisibility({ isOpen, anchorRef: triggerRef, popupRef: menuRef })

  const defaultLabel = t('content.preset.defaultTitle')
  const normalizedValue = useMemo(() => normalizeFontFamily(value), [value])
  const options = useMemo(() => buildFontFamilyOptions(defaultLabel), [defaultLabel])
  const selectedOption = useMemo(() => options.find(option => option.value === normalizedValue), [normalizedValue, options])
  const displayLabel = selectedOption?.label ?? defaultLabel
  const filteredOptions = useMemo(() => {
    const normalizedSearchValue = normalizeSearchValue(searchValue)
    if (!normalizedSearchValue) {
      return options
    }
    return options.filter(option => normalizeSearchValue(option.label).includes(normalizedSearchValue))
  }, [options, searchValue])

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

  useEffect(() => {
    if (!isOpen || readOnly) return
    if (document.head.querySelector(`#${PREVIEW_FONT_STYLE_ID}`)) return

    try {
      const styleElement = document.createElement('style')
      styleElement.id = PREVIEW_FONT_STYLE_ID
      styleElement.textContent = buildPreviewImportStyles()
      document.head.appendChild(styleElement)
    } catch (e) {
      console.warn('[YLC] Failed to load font preview styles:', e)
    }
  }, [isOpen, readOnly])

  useShadowClickAway(rootRef, () => setIsOpen(false))

  const closeMenu = useCallback(() => {
    setIsOpen(false)
    setSearchValue('')
  }, [])

  const commitFontFamily = useCallback(
    (nextFontFamily: string) => {
      const normalizedFontFamily = normalizeFontFamily(nextFontFamily)
      closeMenu()
      if (normalizedFontFamily === normalizedValue) return
      onCommit?.(normalizedFontFamily)
    },
    [closeMenu, normalizedValue, onCommit],
  )

  const handleSelectOption = useCallback(
    (nextFontFamily: string) => {
      commitFontFamily(nextFontFamily)
    },
    [commitFontFamily],
  )

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
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
          handleSelectOption(activeOption.value)
          return
        }
        commitFontFamily('')
        return
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        closeMenu()
      }
    },
    [activeIndex, closeMenu, commitFontFamily, filteredOptions, handleSelectOption],
  )

  const handleToggleMenu = useCallback(() => {
    if (readOnly) return
    setSearchValue('')
    setIsOpen(prev => !prev)
  }, [readOnly])

  const currentValue = displayLabel || defaultLabel

  return (
    <div className='ylc-font-combobox ylc-action-fill' ref={rootRef} data-ylc-font-combobox='true'>
      <button
        ref={triggerRef}
        type='button'
        className={cn('ylc-font-combobox-trigger ylc-action-fill ylc-theme-focus-ring', readOnly && 'ylc-font-combobox-trigger-readonly')}
        onClick={handleToggleMenu}
        aria-label={t('content.setting.fontFamily')}
        aria-haspopup='listbox'
        aria-expanded={isOpen}
        disabled={readOnly}
        data-ylc-font-combobox-trigger='true'
      >
        <span
          className='ylc-font-combobox-trigger-text'
          style={normalizedValue ? { fontFamily: toFontFamilyStyleValue(normalizedValue) } : undefined}
        >
          {currentValue}
        </span>
      </button>

      {!readOnly && isOpen && (
        <div ref={menuRef} className='ylc-font-combobox-menu ylc-theme-shadow-sm ylc-theme-border' data-ylc-font-combobox-menu='true'>
          <input
            ref={searchInputRef}
            className='ylc-font-combobox-search'
            value={searchValue}
            onChange={event => setSearchValue(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('content.setting.fontFamily')}
            role='combobox'
            aria-expanded={isOpen}
            aria-autocomplete='list'
            aria-controls='ylc-font-options-listbox'
            aria-label={t('content.setting.fontFamily')}
            data-ylc-font-combobox-search='true'
            data-testid='font-family-search'
          />
          <span
            aria-live='polite'
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {`${filteredOptions.length} fonts found`}
          </span>
          <div className='ylc-font-combobox-options' role='listbox' id='ylc-font-options-listbox' aria-live='polite'>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === normalizedValue
                const isActive = index === activeIndex
                return (
                  <button
                    key={option.value || '__default'}
                    type='button'
                    role='option'
                    aria-selected={isSelected}
                    className={cn(
                      'ylc-font-combobox-option ylc-theme-focus-ring-soft',
                      isActive && 'ylc-font-combobox-option-active',
                      isSelected && 'ylc-font-combobox-option-selected',
                    )}
                    style={option.value ? { fontFamily: toFontFamilyStyleValue(option.value) } : undefined}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelectOption(option.value)}
                  >
                    <span className='ylc-font-combobox-option-label'>{option.label}</span>
                    {isSelected && <TbCheck size={16} aria-hidden='true' />}
                  </button>
                )
              })
            ) : (
              <div className='ylc-font-combobox-empty ylc-theme-text-muted'>{t('content.setting.fontFamily')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
