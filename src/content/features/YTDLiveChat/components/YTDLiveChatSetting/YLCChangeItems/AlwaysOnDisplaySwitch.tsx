import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useYTDLiveChatStore } from '../../../../../../stores';
import { Switch } from '../../../../../../shared/components/Switch';

export const AlwaysOnDisplaySwitch = () => {
  const { alwaysOnDisplay, setAlwaysOnDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({
      alwaysOnDisplay: state.alwaysOnDisplay,
      setAlwaysOnDisplay: state.setAlwaysOnDisplay,
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
        checked={alwaysOnDisplay}
        id="always-on-display-switch"
        onChange={(checked) => {
          setAlwaysOnDisplay(checked);
        }}
      />
    </div>
  );
};
