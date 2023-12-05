import { useState } from 'react';
import { useGlobalSettingStore } from '../../stores';
import useChromeRuntimeMessageListener from './useChromeRuntimeMessageListener';
import { useTranslation } from 'react-i18next';

export const useGlobalSetting = () => {
  const [ytdLiveChat, setYTDLiveChat] = useState(useGlobalSettingStore.getState().ytdLiveChat);
  const [emojiCopy, setEmojiCopy] = useState(useGlobalSettingStore.getState().emojiCopy);
  const { i18n } = useTranslation();
  const handleMessage = (request: {
    message: string;
    ytdLiveChat?: boolean;
    emojiCopy?: boolean;
    language?: string;
  }) => {
    if (request.message === 'ytdLiveChat') {
      setYTDLiveChat(request?.ytdLiveChat || false);
    } else if (request.message === 'emojiCopy') {
      setEmojiCopy(request.emojiCopy || false);
    } else if (request.message === 'language') {
      i18n.changeLanguage(request?.language || 'en');
    }
  };
  useChromeRuntimeMessageListener(handleMessage);
  return { ytdLiveChat, emojiCopy };
};
