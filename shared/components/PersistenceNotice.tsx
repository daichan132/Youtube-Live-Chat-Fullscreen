import { useAtomValue } from 'jotai'
import { useState } from 'react'
import { CONTENT_UI_LAYER } from '@/shared/constants/zIndex'
import { useLocaleCode, useLocaleDirection } from '@/shared/i18n/react'
import { useOptionalAppRuntime } from '@/shared/runtime/AppProvider'
import { persistenceStatusAtom, themeModeAtom } from '@/shared/state/atoms'
import { useResolvedThemeMode } from '@/shared/theme'

const copyForLocale = (locale: string) =>
  locale === 'ja'
    ? { message: '設定を保存できませんでした。', retry: '再試行' }
    : { message: 'Settings could not be saved.', retry: 'Retry' }

export const PersistenceNotice = ({ compact = false }: { compact?: boolean }) => {
  const status = useAtomValue(persistenceStatusAtom)
  const runtime = useOptionalAppRuntime()
  const locale = useLocaleCode()
  const direction = useLocaleDirection()
  const themeMode = useAtomValue(themeModeAtom)
  const resolvedThemeMode = useResolvedThemeMode(themeMode)
  const [retrying, setRetrying] = useState(false)

  if (status.status !== 'error' && !retrying) return null

  const copy = copyForLocale(locale)
  const copyLanguage = locale === 'ja' ? 'ja' : 'en'
  const retry = async () => {
    if (retrying || !runtime) return
    setRetrying(true)
    try {
      await runtime.retryPersistence()
    } catch {
      // The repository keeps the error visible until a retry succeeds.
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div
      role='alert'
      data-ylc-persistence-error
      data-ylc-theme={resolvedThemeMode}
      dir={direction}
      style={compact ? { zIndex: CONTENT_UI_LAYER.notice } : undefined}
      className={compact ? 'ylc-persistence-notice ylc-persistence-notice--compact' : 'ylc-persistence-notice'}
    >
      <span className='ylc-persistence-notice-message' lang={copyLanguage}>
        <bdi dir='auto'>{copy.message}</bdi>
      </span>
      <button
        type='button'
        disabled={retrying || !runtime}
        aria-busy={retrying}
        lang={copyLanguage}
        className='ylc-persistence-notice-retry'
        onClick={retry}
      >
        {copy.retry}
      </button>
    </div>
  )
}
