import { useCallback } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import classNames from 'classnames';
import { IoTrashOutline } from 'react-icons/io5';
import { MdAutoFixNormal, MdOutlineDragIndicator } from 'react-icons/md';
import { useShallow } from 'zustand/react/shallow';

import { useYTDLiveChatStore } from '../../../../../../stores';
import styles from '../../../styles/YTDLiveChatSetting/PresetContent.module.scss';

interface PresetItemType {
  id: string;
}

export const PresetItem = ({ id }: PresetItemType) => {
  const { title, updateTitle, deletePresetItem } = useYTDLiveChatStore(
    useShallow((state) => ({
      title: state.presetItemStyles[id].title,
      updateTitle: state.updateTitle,
      deletePresetItem: state.deletePresetItem,
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

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateTitle(id, event.target.value);
  };
  const deleteItem = useCallback(
    (id: string) => {
      deletePresetItem(id);
    },
    [deletePresetItem],
  );

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
          <input type="text" value={title} onChange={handleChange} className={styles['title']} />
        </div>
        <div className={styles['rightContainer']}>
          <MdAutoFixNormal size={20} />
          <IoTrashOutline size={20} onClick={() => deleteItem(id)} />
        </div>
      </div>
    </div>
  );
};
