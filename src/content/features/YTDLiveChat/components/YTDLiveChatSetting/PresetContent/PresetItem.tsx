import { useCallback } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import classNames from 'classnames';
import { IoTrashOutline } from 'react-icons/io5';
import { MdAutoFixNormal, MdOutlineDragIndicator } from 'react-icons/md';
import { useShallow } from 'zustand/react/shallow';

import { useYTDLiveChatStore } from '../../../../../../stores';
import { useChangeYLCStyle } from '../../../hooks/YTDLiveChatIframe/useChangeYLCStyle';
import styles from '../../../styles/YTDLiveChatSetting/PresetContent.module.scss';

interface PresetItemType {
  id: string;
}

export const PresetItem = ({ id }: PresetItemType) => {
  const { title, updateTitle, updateYLCStyle, deletePresetItem } = useYTDLiveChatStore(
    useShallow((state) => ({
      title: state.presetItemTitles[id],
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

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateTitle(id, event.target.value);
  };
  const updateStyle = useCallback(() => {
    const ylcStyle = useYTDLiveChatStore.getState().presetItemStyles[id];
    updateYLCStyle(ylcStyle);
    changeYLCStyle(ylcStyle);
  }, [changeYLCStyle, id, updateYLCStyle]);
  const deleteItem = useCallback(() => {
    deletePresetItem(id);
  }, [deletePresetItem, id]);

  return (
    <div
      className={classNames(styles['preset-item'], isDragging && styles['dragging'])}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
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
            onChange={handleTitleChange}
            className={styles['title']}
          />
        </div>
        <div className={styles['rightContainer']}>
          <MdAutoFixNormal size={20} onClick={() => updateStyle()} />
          <IoTrashOutline size={20} onClick={() => deleteItem()} />
        </div>
      </div>
    </div>
  );
};
