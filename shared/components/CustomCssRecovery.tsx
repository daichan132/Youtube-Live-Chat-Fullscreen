import { useAtomValue } from 'jotai'
import { useT } from '@/shared/i18n/react'
import { useOptionalAppRuntime } from '@/shared/runtime/AppProvider'
import { customCssOperationAtom, customCssRecoveryAtom, customCssSuspendedAtom, isCustomCssStoppedAtom } from '@/shared/state/customCssAtoms'

export const CustomCssRecovery = () => {
  const stopped = useAtomValue(isCustomCssStoppedAtom)
  const confirmedStopped = useAtomValue(customCssSuspendedAtom)
  const operation = useAtomValue(customCssOperationAtom)
  const recovery = useAtomValue(customCssRecoveryAtom)
  const runtime = useOptionalAppRuntime()
  const t = useT()
  const failedStop = recovery.failed && recovery.target
  const next = failedStop || !stopped
  const canCancelResume = !recovery.target && (recovery.pending || recovery.failed)
  const save = (target: boolean) => {
    if (runtime) void runtime.customCss.suspend(target).catch(() => {
      // The shared recovery state survives closing and reopening the section.
    })
  }

  return (
    <div className='ylc-custom-css-recovery-control grid gap-2'>
      {confirmedStopped && <p className='m-0 text-xs ylc-theme-text-secondary'>{t('content.customCss.suspended')}</p>}
      <div className='flex flex-wrap gap-2'>
        <button type='button' className='ylc-btn' disabled={!runtime || recovery.pending || (!next && operation !== null)} onClick={() => save(next)}>
          {recovery.pending ? t('content.customCss.saving') : failedStop ? t('content.customCss.retryStop')
            : stopped ? t('content.customCss.resume') : t('content.customCss.stopAll')}
        </button>
        {canCancelResume && (
          <button type='button' className='ylc-btn' disabled={!runtime} onClick={() => save(true)}>
            {t('content.customCss.keepStopped')}
          </button>
        )}
      </div>
      {recovery.failed && <p role='alert' className='m-0 text-xs'>{t('content.customCss.recoveryFailed')}</p>}
      {recovery.pending && recovery.target && <p role='status' className='m-0 text-xs'>{t('content.customCss.savingStop')}</p>}
    </div>
  )
}
