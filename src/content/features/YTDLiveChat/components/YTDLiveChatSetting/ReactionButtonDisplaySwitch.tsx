import React from 'react';
import { Switch } from '../../../../components/Switch';
import { useShallow } from 'zustand/react/shallow';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useYLCReactionButtonDisplayChange } from '../../hooks/YTDLiveChatSetting/useYLCReactionButtonDisplayChange';

export const ReactionButtonDisplaySwitch = () => {
  const { reactionButtonDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({
      reactionButtonDisplay: state.reactionButtonDisplay,
    })),
  );
  const { changeDisplay } = useYLCReactionButtonDisplayChange();
  return (
    <Switch
      checked={reactionButtonDisplay}
      onChange={(checked) => {
        changeDisplay(checked);
      }}
    />
  );
};
