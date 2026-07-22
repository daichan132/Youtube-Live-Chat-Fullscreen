import bannersStyles from './banners.css?inline'
import chatOnlyStyles from './chat-only.css?inline'
import composerStyles from './composer.css?inline'
import coreThemeStyles from './core-theme.css?inline'
import frameStyles from './frame.css?inline'
import leaderboardStyles from './leaderboard.css?inline'
import menusStyles from './menus.css?inline'
import messageLayoutStyles from './message-layout.css?inline'
import monetizationStyles from './monetization.css?inline'
import tokensStyles from './tokens.css?inline'

export const iframeStyleModuleNames = [
  'tokens.css',
  'frame.css',
  'core-theme.css',
  'menus.css',
  'banners.css',
  'leaderboard.css',
  'composer.css',
  'chat-only.css',
  'monetization.css',
  'message-layout.css',
] as const

const iframeStyleModules: Record<(typeof iframeStyleModuleNames)[number], string> = {
  'tokens.css': tokensStyles,
  'frame.css': frameStyles,
  'core-theme.css': coreThemeStyles,
  'menus.css': menusStyles,
  'banners.css': bannersStyles,
  'leaderboard.css': leaderboardStyles,
  'composer.css': composerStyles,
  'chat-only.css': chatOnlyStyles,
  'monetization.css': monetizationStyles,
  'message-layout.css': messageLayoutStyles,
}

const iframeStyles = iframeStyleModuleNames.map(moduleName => iframeStyleModules[moduleName]).join('\n')

export default iframeStyles
