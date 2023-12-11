import React from 'react';

import { useShallow } from 'zustand/react/shallow';

import { Switch } from '../../shared/components/Switch';
import { useGlobalSettingStore } from '../../stores';

export const YTDLiveChatSwitch = () => {
  const { ytdLiveChat, setYTDLiveChat } = useGlobalSettingStore(
    useShallow((state) => ({
      ytdLiveChat: state.ytdLiveChat,
      setYTDLiveChat: state.setYTDLiveChat,
    })),
  );
  return (
    <div
      style={{
        width: '50px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Switch
        checked={ytdLiveChat}
        id="ytd-live-chat-switch"
        onChange={(checked) => {
          setYTDLiveChat(checked);
          chrome.runtime.sendMessage({ message: 'ytdLiveChat', ytdLiveChat: checked });
        }}
      />
    </div>
  );
};
