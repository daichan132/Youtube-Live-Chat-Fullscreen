import { useEffect, useRef, useState } from 'react'
import { browser } from 'wxt/browser'
import type { TranslationKey } from '@/shared/i18n/generated/translationTypes'
import { useT } from '@/shared/i18n/react'
import type { ContentStatusRequest, ContentStatusResponse } from '@/shared/messaging/contentStatus'

export const ContentRecovery = () => {
  const t = useT()
  const [result, setResult] = useState<ContentStatusResponse | null>(null)
  const [message, setMessage] = useState<TranslationKey>('popup.recovery.checking')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const requestRef = useRef(0)
  const tabRef = useRef<number | null>(null)
  const request = async (retry = false) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    const id = ++requestRef.current
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const operation = async () => {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
        if (id !== requestRef.current) return
        if (tab?.id === undefined) throw new Error('No tab')
        if (retry && (tab.id !== tabRef.current || !result)) throw new Error('Tab changed')
        tabRef.current = tab.id
        const payload: ContentStatusRequest = retry && result ? { type: 'ylc:retry', token: result.token } : { type: 'ylc:status' }
        return (await browser.tabs.sendMessage(tab.id, payload, { frameId: 0 })) as ContentStatusResponse
      }
      const response = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('No response')), 3000)
        }),
      ])
      if (id !== requestRef.current) return
      if (!response || !['unsupported', 'starting', 'failed', 'running'].includes(response.status) || typeof response.token !== 'string')
        throw new Error('Invalid response')
      setResult(response)
      setMessage(
        response.retry === 'accepted'
          ? 'popup.recovery.accepted'
          : response.retry === 'stale'
            ? 'popup.recovery.stale'
            : `popup.recovery.${response.status}`,
      )
    } catch {
      if (id === requestRef.current) {
        setResult(null)
        setMessage('popup.recovery.unknown')
      }
    } finally {
      clearTimeout(timer)
      if (id === requestRef.current) {
        requestRef.current += 1
        busyRef.current = false
        setBusy(false)
      }
    }
  }
  useEffect(() => {
    void request()
    return () => {
      requestRef.current += 1
      busyRef.current = false
    }
  }, [])
  return (
    <section className='border-t border-solid ylc-theme-border p-3 text-sm'>
      <p role='status'>{busy ? t('popup.recovery.checking') : t(message)}</p>
      <div className='flex flex-wrap gap-2'>
        <button type='button' className='ylc-btn' disabled={busy} onClick={() => request()}>
          {t('popup.recovery.check')}
        </button>
        <button
          type='button'
          className='ylc-btn'
          disabled={busy || !result || result.status === 'unsupported'}
          onClick={() => request(true)}
        >
          {t('popup.recovery.retry')}
        </button>
        <button
          type='button'
          className='ylc-btn'
          disabled={busy || !result?.report}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(JSON.stringify(result?.report, null, 2))
              setMessage('popup.recovery.copied')
            } catch {
              setMessage('popup.recovery.copyFailed')
            }
          }}
        >
          {t('popup.recovery.copy')}
        </button>
      </div>
    </section>
  )
}
