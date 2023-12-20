import React from 'react';

import { useShallow } from 'zustand/react/shallow';

import { Switch } from '../../../../../../shared/components/Switch';
import { useYTDLiveChatStore } from '../../../../../../stores';

export const ChatOnlyDisplaySwitch = () => {
  const { chatOnlyDisplay, updateYLCStyle } = useYTDLiveChatStore(
    useShallow((state) => ({
      chatOnlyDisplay: state.chatOnlyDisplay,
      updateYLCStyle: state.updateYLCStyle,
    })),
  );
  return (
    <div
      style={{
        width: '150px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Switch
        checked={chatOnlyDisplay}
        id="chat-only-display-switch"
        onChange={(checked) => {
          updateYLCStyle({ chatOnlyDisplay: checked });
        }}
      />
    </div>
  );
};
