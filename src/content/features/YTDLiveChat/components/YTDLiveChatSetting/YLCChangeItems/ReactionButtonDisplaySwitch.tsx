import React from 'react';
import { Switch } from '../../../../../components/Switch';
import { useShallow } from 'zustand/react/shallow';
import { useYTDLiveChatStore } from '../../../../../../stores';
import { useYLCReactionButtonDisplayChange } from '../../../hooks/YTDLiveChatSetting/useYLCReactionButtonDisplayChange';

export const ReactionButtonDisplaySwitch = () => {
  const { reactionButtonDisplay, setReactionButtonDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({
      reactionButtonDisplay: state.reactionButtonDisplay,
      setReactionButtonDisplay: state.setReactionButtonDisplay,
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
          setReactionButtonDisplay(checked);
        }}
      />
    </div>
  );
};
