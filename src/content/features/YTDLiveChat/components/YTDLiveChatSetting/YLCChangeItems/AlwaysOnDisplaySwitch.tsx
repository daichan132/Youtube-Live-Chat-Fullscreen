import React from 'react';
import { Switch } from '../../../../../components/Switch';
import { useShallow } from 'zustand/react/shallow';
import { useYTDLiveChatStore } from '../../../../../../stores';

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
