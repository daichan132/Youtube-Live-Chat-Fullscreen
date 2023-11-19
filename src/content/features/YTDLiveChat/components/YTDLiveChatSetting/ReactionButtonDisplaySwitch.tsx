import React from 'react';
import { Switch } from '../../../../components/Switch';
import { useShallow } from 'zustand/react/shallow';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useYLCReactionButtonDisplayChange } from '../../hooks/useYLCReactionButtonDisplayChange';

export const ReactionButtonDisplaySwitch = () => {
  const { ReactionButtonDisplay } = useYTDLiveChatStore(
    useShallow((state) => ({
      ReactionButtonDisplay: state.ReactionButtonDisplay,
    })),
  );
  const { changeDisplay } = useYLCReactionButtonDisplayChange();
  return (
    <Switch
      checked={ReactionButtonDisplay}
      onChange={(checked) => {
        changeDisplay(checked);
      }}
    />
  );
};
