import { describe, expect, it } from 'vitest'
import { customCssLocalStopAtom, customCssRecoveryAtom, customCssSuspendedAtom } from '@/shared/state/customCssAtoms'
import { createTestStore, renderWithStore } from '@/shared/state/testUtils'
import { CustomCssRecovery } from './CustomCssRecovery'

it('does not announce a globally confirmed pause for a failed local stop request', () => {
  const store = createTestStore()
  store.set(customCssSuspendedAtom, false)
  store.set(customCssLocalStopAtom, true)
  store.set(customCssRecoveryAtom, { pending: false, target: true, failed: true })
  const view = renderWithStore(<CustomCssRecovery />, store)
  expect(view.queryByText('content.customCss.suspended')).toBeNull()
  expect(view.getByRole('alert')).toHaveTextContent('content.customCss.recoveryFailed')
  expect(view.getByRole('button', { name: 'content.customCss.retryStop' })).toBeInTheDocument()
})

describe('recovery status', () => {
  it('keeps a separate pause action visible during a pending resume', () => {
    const store = createTestStore()
    store.set(customCssRecoveryAtom, { pending: true, target: false, failed: false })
    const view = renderWithStore(<CustomCssRecovery />, store)
    expect(view.getByRole('button', { name: 'content.customCss.keepStopped' })).toBeInTheDocument()
    expect(view.getByRole('button', { name: 'content.customCss.saving' })).toBeDisabled()
  })
})
