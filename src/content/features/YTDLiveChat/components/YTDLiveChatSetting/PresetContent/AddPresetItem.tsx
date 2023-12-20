import React, { useCallback } from 'react';

import { useTranslation } from 'react-i18next';
import { MdAdd } from 'react-icons/md';
import { v4 as uuidv4 } from 'uuid';
import { useShallow } from 'zustand/react/shallow';

import { useYTDLiveChatStore } from '../../../../../../stores';
import styles from '../../../styles/YTDLiveChatSetting/PresetContent.module.scss';

export const AddPresetItem = () => {
  const { addPresetItem } = useYTDLiveChatStore(
    useShallow((state) => ({
      addPresetItem: state.addPresetItem,
    })),
  );
  const { t } = useTranslation();
  const addItem = useCallback(() => {
    const state = useYTDLiveChatStore.getState();
    const ylcStyle = {
      bgColor: state.bgColor,
      fontColor: state.fontColor,
      fontFamily: state.fontFamily,
      fontSize: state.fontSize,
      blur: state.blur,
      space: state.space,
      size: state.size,
      coordinates: state.coordinates,
      alwaysOnDisplay: state.alwaysOnDisplay,
      chatOnlyDisplay: state.chatOnlyDisplay,
      userNameDisplay: state.userNameDisplay,
      userIconDisplay: state.userIconDisplay,
      reactionButtonDisplay: state.reactionButtonDisplay,
    };
    addPresetItem(uuidv4(), t('content.preset.addItemTitle'), ylcStyle);
  }, [addPresetItem, t]);
  return (
    <div className={styles['add-preset-item']} onClick={() => addItem()}>
      <MdAdd size={20} /> <div>{t('content.preset.addMessage')}</div>
    </div>
  );
};
