import React from 'react';
import { Switch } from '../../../../../components/Switch';
import { useShallow } from 'zustand/react/shallow';
import { useYTDLiveChatStore } from '../../../../../../stores';
import { useYLCUserNameDisplayChange } from '../../../hooks/YTDLiveChatSetting/useYLCUserNameDisplayChange';

export const UserNameDisplaySwitch = () => {
  const { userNameDisplay, setUserNameDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({
      userNameDisplay: state.userNameDisplay,
      setUserNameDisplay: state.setUserNameDisplay,
    })),
  );
  const { changeDisplay } = useYLCUserNameDisplayChange();
  return (
    <div
      style={{
        width: '150px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Switch
        checked={userNameDisplay}
        id="user-name-display-switch"
        onChange={(checked) => {
          changeDisplay(checked);
          setUserNameDisplay(checked);
        }}
      />
    </div>
  );
};
