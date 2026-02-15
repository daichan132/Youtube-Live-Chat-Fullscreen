import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { TbDownload, TbUpload } from 'react-icons/tb'
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string)
        if (!isValidImportData(data)) {
          alert('Invalid settings file.')
          return
        }
        await persistImportedSettings(data)
        window.close()
      } catch {
        alert('Failed to parse settings file.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className='ylc-theme-links-wrap ylc-action-fill ylc-action-inner'>
      <button
        type='button'
        data-tooltip={t('popup.export')}
        aria-label={t('popup.export')}
        className='ylc-theme-action-button'
        onClick={handleExport}
      >
        <TbDownload size={20} aria-hidden='true' />
      </button>
      <button
        type='button'
        data-tooltip={t('popup.import')}
        aria-label={t('popup.import')}
        className='ylc-theme-action-button'
        onClick={() => fileInputRef.current?.click()}
      >
        <TbUpload size={20} aria-hidden='true' />
      </button>
      <input ref={fileInputRef} type='file' accept='.json' onChange={handleImport} style={{ display: 'none' }} />
    </div>
  )
}
