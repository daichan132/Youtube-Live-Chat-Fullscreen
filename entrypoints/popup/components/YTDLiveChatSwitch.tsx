import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useId } from 'react'

import { Switch } from '@/shared/components/Switch'
import { setYTDLiveChatEnabledAtom, ytdLiveChatEnabledAtom } from '@/shared/state'

export const YTDLiveChatSwitch = () => {
  const id = useId()
  const ytdLiveChat = useAtomValue(ytdLiveChatEnabledAtom)
  const setYTDLiveChat = useSetAtom(setYTDLiveChatEnabledAtom)
  const handleSwitchChange = useCallback(
    (checked: boolean) => {
      setYTDLiveChat(checked)
    },
    [setYTDLiveChat],
  )

  return <Switch checked={ytdLiveChat} id={id} onChange={handleSwitchChange} />
}
