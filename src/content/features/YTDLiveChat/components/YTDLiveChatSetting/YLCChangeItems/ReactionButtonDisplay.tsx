import React from 'react';

import { useShallow } from 'zustand/react/shallow';

import { Switch } from '../../../../../../shared/components/Switch';
import { useYTDLiveChatStore } from '../../../../../../stores';
import { useYLCReactionButtonDisplayChange } from '../../../hooks/YTDLiveChatSetting/useYLCReactionButtonDisplayChange';

export const ReactionButtonDisplaySwitch = () => {
  const { reactionButtonDisplay, updateYLCStyleUpdate } = useYTDLiveChatStore(
    useShallow((state) => ({
      reactionButtonDisplay: state.reactionButtonDisplay,
      updateYLCStyleUpdate: state.updateYLCStyleUpdate,
    })),
  );
  const { changeDisplay } = useYLCReactionButtonDisplayChange();
  return (
    <div
      style={{
        width: '150px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Switch
        checked={reactionButtonDisplay}
        id="reaction-button-display-switch"
        onChange={(checked) => {
          changeDisplay(checked);
          updateYLCStyleUpdate({ reactionButtonDisplay: checked });
        }}
      />
    </div>
  );
};
