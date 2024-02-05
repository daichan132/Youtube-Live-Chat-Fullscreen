import { YTDLiveChat } from './features/YTDLiveChat';
import { useGlobalSetting } from './hooks/useGlobalSetting';

const Content = () => {
  const { ytdLiveChat } = useGlobalSetting();
  return <>{ytdLiveChat ? <YTDLiveChat /> : null}</>;
};

export default Content;
