import { useCallback } from 'react';
import React from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import classNames from 'classnames';
import { IoTrashOutline } from 'react-icons/io5';
import { MdAutoFixNormal, MdOutlineDragIndicator } from 'react-icons/md';
import { useClickAway } from 'react-use';
import { useShallow } from 'zustand/react/shallow';

import { useYTDLiveChatStore } from '../../../../../../stores';
import { useChangeYLCStyle } from '../../../hooks/YTDLiveChatIframe/useChangeYLCStyle';
import styles from '../../../styles/YTDLiveChatSetting/PresetContent.module.scss';

import { PresetSettingContent } from './PresetSettingContent';

import type { YLCStyleType } from '../../../../../../types/ytdLiveChatType';

interface PresetItemType {
  id: string;
}
useYTDLiveChatStore.persist.clearStorage();
export const PresetItem = ({ id }: PresetItemType) => {
  const { title, ylcStyle, updateTitle, updateYLCStyle, deletePresetItem } = useYTDLiveChatStore(
    useShallow((state) => ({
      title: state.presetItemTitles[id],
      ylcStyle: state.presetItemStyles[id],
      updateTitle: state.updateTitle,
      deletePresetItem: state.deletePresetItem,
      updateYLCStyle: state.updateYLCStyle,
    })),
  );
  const {
    attributes,
    setActivatorNodeRef,
    listeners,
    setNodeRef,
    transform,
    isDragging,
    transition,
  } = useSortable({
    id: id,
  });
  const changeYLCStyle = useChangeYLCStyle();
  const updateStyle = useCallback(
    (ylcStyle: YLCStyleType) => {
      updateYLCStyle(ylcStyle);
      changeYLCStyle(ylcStyle);
    },
    [changeYLCStyle, updateYLCStyle],
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef(null);
  useClickAway(ref, () => {
    setIsOpen(false);
  });
  return (
    <div
      className={classNames(styles['preset-item'], isDragging && styles['dragging'])}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div ref={ref}>
        <div className={styles['flex']}>
          <div className={styles['leftContainer']}>
            <div ref={setActivatorNodeRef}>
              <MdOutlineDragIndicator
                className={classNames(styles['dragIcon'], isDragging && styles['dragging'])}
                size={20}
                {...listeners}
                {...attributes}
              />
            </div>
            <input
              type="text"
              value={title}
              onChange={(event) => updateTitle(id, event.target.value)}
              className={styles['title']}
            />
          </div>
          <div className={styles['rightContainer']}>
            <MdAutoFixNormal
              className={styles['applyStyleButton']}
              size={20}
              onClick={() => updateStyle(ylcStyle)}
            />
            <IoTrashOutline
              className={styles['deleteButton']}
              size={20}
              onClick={() => deletePresetItem(id)}
            />
          </div>
        </div>
        <PresetSettingContent ylcStyle={ylcStyle} isOpen={isOpen} />
      </div>
    </div>
  );
};
