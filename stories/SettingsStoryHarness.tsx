import { useEffect, useRef, useState } from 'react'
import { YTDLiveChatSetting } from '@/entrypoints/content/features/YTDLiveChatSetting/components/YTDLiveChatSetting'
import { useT } from '@/shared/i18n/react'
import { AppProvider } from '@/shared/runtime/AppProvider'
import {
  createCustomCssStoryRuntime,
  type StoryLocale,
  type StorySaveControls,
  type StorySeed,
  type StoryTheme,
} from './customCssStoryRuntime'

export type SettingsStoryArgs = StorySaveControls & { seed: StorySeed }
type HarnessProps = SettingsStoryArgs & { locale: StoryLocale; theme: StoryTheme; description: string }

const SettingsSurface = () => {
  const [open, setOpen] = useState(true)
  const t = useT()
  return (
    <>
      {!open && (
        <button type='button' className='ylc-btn' onClick={() => setOpen(true)}>
          {t('content.aria.openSettings')}
        </button>
      )}
      <YTDLiveChatSetting open={open} onOpenChange={setOpen} />
    </>
  )
}

export const SettingsStoryHarness = ({ seed, saveDelayMs, failureMode, locale, theme, description }: HarnessProps) => {
  // Preferences and save controls update this instance without replacing its
  // draft. The CSF render key creates an independent session for each story.
  const [session] = useState(() => createCustomCssStoryRuntime(seed, { locale, theme }, { saveDelayMs, failureMode }))
  const lifetimes = useRef(new Map<typeof session, number>())
  useEffect(() => {
    session.setPreferences({ locale, theme })
  }, [session, locale, theme])
  useEffect(() => {
    session.setControls({ saveDelayMs, failureMode })
  }, [session, saveDelayMs, failureMode])
  useEffect(() => {
    const generation = (lifetimes.current.get(session) ?? 0) + 1
    const mountedSessions = lifetimes.current
    mountedSessions.set(session, generation)
    return () =>
      queueMicrotask(() => {
        // React StrictMode may immediately mount the same session again.
        if (mountedSessions.get(session) !== generation) return
        session.runtime.dispose()
        mountedSessions.delete(session)
      })
  }, [session])
  return (
    <AppProvider runtime={session.runtime}>
      <div
        data-ylc-theme={theme === 'system' ? undefined : theme}
        style={{
          minHeight: '100vh',
          padding: 24,
          boxSizing: 'border-box',
          background: 'radial-gradient(ellipse at 70% 20%, #27364c, #101722 65%)',
        }}
      >
        <p data-story-context style={{ margin: 0, maxWidth: 260, color: '#d1d8e3', fontSize: 12, lineHeight: 1.6 }}>
          {description}
        </p>
        <SettingsSurface />
      </div>
    </AppProvider>
  )
}
