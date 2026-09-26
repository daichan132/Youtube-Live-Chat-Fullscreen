import type { TranslationKey } from '@/shared/i18n/generated/translationTypes'
import accent from './chatCssPresets/accent.css?raw'
import bubbles from './chatCssPresets/bubbles.css?raw'
import cards from './chatCssPresets/cards.css?raw'
import comfortable from './chatCssPresets/comfortable.css?raw'
import compact from './chatCssPresets/compact.css?raw'
import outline from './chatCssPresets/outline.css?raw'

export type ChatCssPreset = {
  readonly id: string
  readonly labelKey: TranslationKey
  readonly descriptionKey: TranslationKey
  readonly noteKey?: TranslationKey
  readonly css: string
}

// Packaged sources, not saved registrations. Loading copies ordinary CSS into
// the editor; it never applies it, changes appearance settings or consumes a slot.
// Explicit raw imports must NOT inject these styles into the settings Document.
export const CHAT_CSS_PRESETS: readonly ChatCssPreset[] = [
  {
    id: 'bubbles',
    labelKey: 'content.customCss.presetBubbles',
    descriptionKey: 'content.customCss.presetBubblesDescription',
    css: bubbles,
  },
  {
    id: 'cards',
    labelKey: 'content.customCss.presetCards',
    descriptionKey: 'content.customCss.presetCardsDescription',
    css: cards,
  },
  {
    id: 'outline',
    labelKey: 'content.customCss.presetOutline',
    descriptionKey: 'content.customCss.presetOutlineDescription',
    noteKey: 'content.customCss.presetOutlineNote',
    css: outline,
  },
  {
    id: 'compact',
    labelKey: 'content.customCss.presetCompact',
    descriptionKey: 'content.customCss.presetCompactDescription',
    css: compact,
  },
  {
    id: 'comfortable',
    labelKey: 'content.customCss.presetComfortable',
    descriptionKey: 'content.customCss.presetComfortableDescription',
    css: comfortable,
  },
  {
    id: 'accent',
    labelKey: 'content.customCss.presetAccent',
    descriptionKey: 'content.customCss.presetAccentDescription',
    css: accent,
  },
]
