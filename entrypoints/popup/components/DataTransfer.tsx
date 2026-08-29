import { useCallback, useEffect, useRef, useState } from 'react'
import { TbDownload, TbUpload } from '@/shared/components/icons'
import { useT } from '@/shared/i18n/react'
import { useAppRuntime } from '@/shared/runtime/AppProvider'
import { MAX_SETTINGS_BACKUP_BYTES } from '@/shared/settings/persistConfig'

const handleExport = (data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `yt-livechat-fullscreen-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const DataTransfer = () => {
  const t = useT()
  const runtime = useAppRuntime()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showError = useCallback((message: string) => {
    setErrorMessage(message)
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    dismissTimerRef.current = setTimeout(() => setErrorMessage(null), 4000)
  }, [])

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_SETTINGS_BACKUP_BYTES) {
      showError(t('popup.importError'))
      return
    }
    try {
      const data: unknown = JSON.parse(await file.text())
      await runtime.importSettings(data)
      window.close()
    } catch {
      showError(t('popup.importError'))
    }
  }

  return (
    <>
      <div className='ylc-theme-links-wrap'>
        <button
          type='button'
          aria-label={t('popup.export')}
          data-tooltip={t('popup.export')}
          className='ylc-theme-icon-link'
          onClick={() => handleExport(runtime.exportSettings())}
        >
          <TbDownload size={18} aria-hidden='true' />
        </button>
        <button
          type='button'
          aria-label={t('popup.import')}
          data-tooltip={t('popup.import')}
          className='ylc-theme-icon-link'
          onClick={() => fileInputRef.current?.click()}
        >
          <TbUpload size={18} aria-hidden='true' />
        </button>
        <input ref={fileInputRef} type='file' accept='.json' onChange={handleImport} style={{ display: 'none' }} />
      </div>
      <div className='ylc-toast-host' role='status' aria-live='polite'>
        {errorMessage ? (
          <div className='ylc-toast ylc-toast--error'>
            <span className='ylc-toast-dot' aria-hidden='true' />
            {errorMessage}
          </div>
        ) : null}
      </div>
    </>
  )
}
