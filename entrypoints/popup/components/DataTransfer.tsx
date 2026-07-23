import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TbDownload, TbUpload } from '@/shared/components/icons'
import { buildExportData, isValidImportData, persistImportedSettings } from '../utils/dataTransfer'

const handleExport = () => {
  const data = buildExportData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `yt-livechat-fullscreen-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const DataTransfer = () => {
  const { t } = useTranslation()
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (!isValidImportData(data)) {
          showError(t('popup.importError'))
          return
        }
        await persistImportedSettings(data)
        window.close()
      } catch {
        showError(t('popup.importError'))
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <>
      <div className='ylc-theme-links-wrap'>
        <button
          type='button'
          aria-label={t('popup.export')}
          data-tooltip={t('popup.export')}
          className='ylc-theme-icon-link'
          onClick={handleExport}
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
