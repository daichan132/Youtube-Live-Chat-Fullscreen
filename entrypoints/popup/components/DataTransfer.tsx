import { useEffect, useRef, useState } from 'react'
import { TbDownload, TbUpload } from '@/shared/components/icons'
import { useT } from '@/shared/i18n/react'
import { useAppRuntime } from '@/shared/runtime/AppProvider'
import { normalizeSettingsBackup } from '@/shared/settings/backup'
import { MAX_SETTINGS_BACKUP_BYTES } from '@/shared/settings/persistConfig'
import { SettingsImportError } from '@/shared/settings/repository'

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
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState<{ name: string; data: unknown } | null>(null)
  const [phase, setPhase] = useState<'idle' | 'reading' | 'confirm' | 'applying'>('idle')
  const requestRef = useRef(0)
  const applyingRef = useRef(false)
  useEffect(
    () => () => {
      requestRef.current += 1
    },
    [],
  )
  const cancel = () => {
    requestRef.current += 1
    setPending(null)
    setMessage(null)
    setPhase('idle')
  }
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || applyingRef.current) return
    const request = ++requestRef.current
    setPending(null)
    setMessage(null)
    setPhase('reading')
    try {
      if (file.size > MAX_SETTINGS_BACKUP_BYTES) throw new Error('Backup too large')
      const data: unknown = JSON.parse(await file.text())
      if (request !== requestRef.current) return
      if (!normalizeSettingsBackup(data, runtime.exportSettings())) throw new Error('Invalid backup')
      setPending({ name: file.name, data })
      setPhase('confirm')
    } catch {
      if (request !== requestRef.current) return
      setMessage(t('popup.importError'))
      setPhase('idle')
    }
  }
  const apply = async () => {
    if (!pending || applyingRef.current) return
    applyingRef.current = true
    const request = ++requestRef.current
    setPhase('applying')
    try {
      // Keep raw data until confirmation; runtime normalizes with current settings.
      await runtime.importSettings(pending.data)
      if (request === requestRef.current) setMessage(t('popup.importDone'))
    } catch (error) {
      if (request !== requestRef.current) return
      const key =
        error instanceof SettingsImportError
          ? (
              {
                'before-write': 'popup.importBeforeWrite',
                write: 'popup.importWrite',
                readback: 'popup.importReadback',
                'following-write': 'popup.importFollowingWrite',
              } as const
            )[error.phase]
          : 'popup.importError'
      setMessage(t(key))
    } finally {
      applyingRef.current = false
      if (request === requestRef.current) {
        setPending(null)
        setPhase('idle')
      }
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
          disabled={phase === 'applying'}
          aria-label={t('popup.import')}
          data-tooltip={t('popup.import')}
          className='ylc-theme-icon-link'
          onClick={() => fileInputRef.current?.click()}
        >
          <TbUpload size={18} aria-hidden='true' />
        </button>
        <input ref={fileInputRef} type='file' accept='.json' onChange={handleImport} style={{ display: 'none' }} />
      </div>
      {phase !== 'idle' || message ? (
        <section
          aria-label={t('popup.import')}
          className='fixed inset-x-2 bottom-2 z-50 rounded-lg border border-solid ylc-theme-border ylc-theme-surface p-3 shadow-lg'
        >
          <div role='status' aria-live='polite'>
            {phase === 'reading' ? t('popup.importReading') : phase === 'applying' ? t('popup.importApplying') : message}
          </div>
          {pending && phase === 'confirm' ? (
            <>
              <p className='break-all'>{pending.name}</p>
              <p>{t('popup.importConfirm')}</p>
              <button type='button' className='ylc-btn' onClick={() => handleExport(runtime.exportSettings())}>
                {t('popup.export')}
              </button>
              <button type='button' className='ylc-btn' onClick={apply}>
                {t('popup.importApply')}
              </button>
            </>
          ) : null}
          {phase !== 'applying' ? (
            <button type='button' className='ylc-btn' onClick={cancel}>
              {phase === 'idle' ? t('popup.importClose') : t('popup.importCancel')}
            </button>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
