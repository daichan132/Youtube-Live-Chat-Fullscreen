import { useState } from 'react';
import { useGlobalSettingStore } from '../../stores';
import useChromeRuntimeMessageListener from './useChromeRuntimeMessageListener';

export const useGlobalSetting = () => {
  const [ytdLiveChat, setYTDLiveChat] = useState(useGlobalSettingStore.getState().ytdLiveChat);
  const [emojiCopy, setEmojiCopy] = useState(useGlobalSettingStore.getState().emojiCopy);
  const handleMessage = (request: {
    message: string;
    ytdLiveChat?: boolean;
    emojiCopy?: boolean;
  }) => {
    if (request.message === 'ytdLiveChat') {
      setYTDLiveChat(request?.ytdLiveChat || false);
    } else if (request.message === 'emojiCopy') {
      setEmojiCopy(request.emojiCopy || false);
    }
  };
  useChromeRuntimeMessageListener(handleMessage);
  return { ytdLiveChat, emojiCopy };
};
