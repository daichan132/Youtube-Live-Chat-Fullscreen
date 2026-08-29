import { useAtomValue } from 'jotai'
import { useState } from 'react'
import { useLocaleCode } from '@/shared/i18n/react'
import { useOptionalAppRuntime } from '@/shared/runtime/AppProvider'
import { persistenceStatusAtom } from '@/shared/state/atoms'

const copyForLocale = (locale: string) =>
  locale === 'ja'
    ? { message: '設定を保存できませんでした。', retry: '再試行' }
    : { message: 'Settings could not be saved.', retry: 'Retry' }

export const PersistenceNotice = ({ compact = false }: { compact?: boolean }) => {
  const status = useAtomValue(persistenceStatusAtom)
  const runtime = useOptionalAppRuntime()
  const locale = useLocaleCode()
  const [retrying, setRetrying] = useState(false)

  if (status.status !== 'error') return null

  const copy = copyForLocale(locale)
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
      className={
        compact
          ? 'pointer-events-auto fixed top-3 right-3 z-[2147483647] inline-flex max-w-[360px] items-center gap-2 rounded-lg border border-solid border-red-400/60 bg-red-950/90 px-3 py-2 text-xs text-white shadow-lg'
          : 'm-2 flex items-center justify-between gap-3 rounded-lg border border-solid border-red-400/50 bg-red-50 px-3 py-2 text-sm text-red-950 dark:bg-red-950 dark:text-red-50'
      }
    >
      <span>{copy.message}</span>
      <button
        type='button'
        disabled={retrying || !runtime}
        className='shrink-0 cursor-pointer rounded-md border border-current bg-transparent px-2 py-1 font-semibold text-inherit disabled:cursor-wait disabled:opacity-60'
        onClick={retry}
      >
        {copy.retry}
      </button>
    </div>
  )
}
