import React from 'react';

import { useShallow } from 'zustand/react/shallow';

import { Switch } from '../../shared/components/Switch';
import { useGlobalSettingStore } from '../../stores';

export const EmojiCopySwitch = () => {
  const { emojiCopy, setEmojiCopy } = useGlobalSettingStore(
    useShallow((state) => ({
      emojiCopy: state.emojiCopy,
      setEmojiCopy: state.setEmojiCopy,
    })),
  );

  return (
    <div
      style={{
        width: '50px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Switch
        checked={emojiCopy}
        id="emoji-copy-switch"
        onChange={(checked) => {
          setEmojiCopy(checked);
          chrome.runtime.sendMessage({ message: 'emojiCopy', emojiCopy: checked });
        }}
      />
    </div>
  );
};
