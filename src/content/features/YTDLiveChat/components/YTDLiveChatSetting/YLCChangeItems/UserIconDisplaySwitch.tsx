import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useYTDLiveChatStore } from '../../../../../../stores';
import { useYLCUserIconDisplayChange } from '../../../hooks/YTDLiveChatSetting/useYLCUserIconDisplayChange';
import { Switch } from '../../../../../../shared/components/Switch';

export const UserIconDisplaySwitch = () => {
  const { userIconDisplay, setUserIconDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({
      userIconDisplay: state.userIconDisplay,
      setUserIconDisplay: state.setUserIconDisplay,
    })),
  );
  const { changeDisplay } = useYLCUserIconDisplayChange();
  return (
    <div
      style={{
        width: '150px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Switch
        checked={userIconDisplay}
        id="user-icon-display-switch"
        onChange={(checked) => {
          changeDisplay(checked);
          setUserIconDisplay(checked);
        }}
      />
    </div>
  );
};
