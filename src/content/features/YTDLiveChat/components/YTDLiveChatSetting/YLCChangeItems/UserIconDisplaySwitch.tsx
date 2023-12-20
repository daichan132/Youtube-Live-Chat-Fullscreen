import React from 'react';

import { useShallow } from 'zustand/react/shallow';

import { Switch } from '../../../../../../shared/components/Switch';
import { useYTDLiveChatStore } from '../../../../../../stores';
import { useYLCUserIconDisplayChange } from '../../../hooks/YTDLiveChatSetting/useYLCUserIconDisplayChange';

export const UserIconDisplaySwitch = () => {
  const { userIconDisplay, updateYLCStyleUpdate } = useYTDLiveChatStore(
    useShallow((state) => ({
      userIconDisplay: state.userIconDisplay,
      updateYLCStyleUpdate: state.updateYLCStyleUpdate,
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
          updateYLCStyleUpdate({ userIconDisplay: checked });
        }}
      />
    </div>
  );
};
