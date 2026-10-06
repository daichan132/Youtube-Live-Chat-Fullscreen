import coreTheme from '@/entrypoints/content/features/YTDLiveChatIframe/styles/core-theme.css?inline'
import messageLayout from '@/entrypoints/content/features/YTDLiveChatIframe/styles/message-layout.css?inline'
import tokens from '@/entrypoints/content/features/YTDLiveChatIframe/styles/tokens.css?inline'
import { compileStylePatch } from '@/entrypoints/content/style/compileStylePatch'
import { CHAT_CSS_PRESETS, type ChatCssPreset } from '@/shared/settings/chatCssPresets'
import type { ChatProfile } from '@/shared/settings/model'
import previewFrame from './chatCssPreviewFrame.css?inline'

export type ChatCssPreviewMessage = {
  id: string
  initial: string
  author: string
  message: string
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
const escapeStyleText = (value: string) => value.replace(/</g, '\\3c ')
const styleProperties = (properties: Record<string, string>) =>
  Object.entries(properties)
    .map(([property, value]) => `${property}:${value}`)
    .join(';')

export const findPackagedChatCssPreset = (preset?: ChatCssPreset): ChatCssPreset | undefined =>
  preset && CHAT_CSS_PRESETS.find(entry => entry.id === preset.id && entry.css === preset.css)

// The source is selected by exact catalog identity, never from an editor, saved
// registration or caller metadata. All variable sample text stays escaped HTML.
export const buildChatCssPreviewDocument = ({
  preset,
  profile,
  direction,
  language,
  title,
  messages,
}: {
  preset?: ChatCssPreset
  profile: ChatProfile
  direction: 'ltr' | 'rtl'
  language: string
  title: string
  messages: readonly ChatCssPreviewMessage[]
}): string | null => {
  const packaged = findPackagedChatCssPreset(preset)
  if (!packaged) return null
  const patch = compileStylePatch(profile, { membershipDefaultColor: null, firefox: false })
  const messageHtml = messages
    .map(
      message => `
    <yt-live-chat-text-message-renderer class="yt-live-chat-text-message-renderer" data-preview-message="${escapeHtml(message.id)}">
      <yt-img-shadow id="author-photo" class="yt-live-chat-text-message-renderer"><span class="ylc-preview-avatar">${escapeHtml(message.initial)}</span></yt-img-shadow>
      <div id="content" class="yt-live-chat-text-message-renderer">
        <yt-live-chat-author-chip class="yt-live-chat-text-message-renderer"><span id="author-name" class="yt-live-chat-author-chip">${escapeHtml(message.author)}</span></yt-live-chat-author-chip>
        <span id="message" class="yt-live-chat-text-message-renderer">${escapeHtml(message.message)}</span>
      </div>
    </yt-live-chat-text-message-renderer>`,
    )
    .join('')
  return `<!doctype html>
<html lang="${escapeHtml(language)}" dir="${direction}" style="${escapeHtml(styleProperties(patch.documentProperties))}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="no-referrer">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style data-ylc-css-preview-base>${escapeStyleText([previewFrame, tokens, coreTheme, messageLayout].join('\n'))}</style>
<style data-ylc-css-preview-source="${escapeHtml(packaged.id)}">${escapeStyleText(packaged.css)}</style>
</head>
<body class="custom-yt-app-live-chat-extension" style="${escapeHtml(styleProperties(patch.bodyProperties))}">
<yt-live-chat-renderer><yt-live-chat-item-list-renderer><div id="items">${messageHtml}
</div></yt-live-chat-item-list-renderer></yt-live-chat-renderer>
</body>
</html>`
}
