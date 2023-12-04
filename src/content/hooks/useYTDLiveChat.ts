import { useState } from 'react';
import { useGlobalSettingStore } from '../../stores';
import useChromeRuntimeMessageListener from './useChromeRuntimeMessageListener';

export const useYTDLiveChat = () => {
  const [ytdLiveChat, setYTDLiveChat] = useState(useGlobalSettingStore.getState().ytdLiveChat);
  const handleMessage = (request: {
    message: string;
    ytdLiveChat: boolean | ((prevState: boolean) => boolean);
  }) => {
    if (request.message === 'ytdLiveChat') {
      setYTDLiveChat(request.ytdLiveChat);
    }
  };
  useChromeRuntimeMessageListener(handleMessage);
  return ytdLiveChat;
};
