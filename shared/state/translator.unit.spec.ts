import { createStore } from 'jotai/vanilla'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { TranslationKey } from '@/shared/i18n/generated/translationTypes'
import { translatorAtom } from './atoms'

describe('typed translation boundary', () => {
  it('accepts only generated translation keys', () => {
    const translate = createStore().get(translatorAtom)
    expectTypeOf(translate).parameter(0).toEqualTypeOf<TranslationKey>()
    expect(translate('content.aria.close')).toBe('content.aria.close')
  })
})
