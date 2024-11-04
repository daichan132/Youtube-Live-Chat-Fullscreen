import { useGlobalSetting } from '@/shared/hooks/useGlobalSetting'
import { YTDLiveChat } from './YTDLiveChat'

const Content = () => {
  const { ytdLiveChat } = useGlobalSetting()
  return <>{ytdLiveChat ? <YTDLiveChat /> : null}</>
}

export default Content
