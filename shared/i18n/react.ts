import { useAtomValue } from 'jotai'
import { localeCodeAtom, localeDirectionAtom, translatorAtom } from '@/shared/state'

export const useT = () => useAtomValue(translatorAtom)
export const useLocaleCode = () => useAtomValue(localeCodeAtom)
export const useLocaleDirection = () => useAtomValue(localeDirectionAtom)
