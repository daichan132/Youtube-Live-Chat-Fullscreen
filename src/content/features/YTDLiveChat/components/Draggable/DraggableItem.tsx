import { CSS } from '@dnd-kit/utilities';
import { Resizable } from 're-resizable';
import classNames from 'classnames';
import { useDraggable } from '@dnd-kit/core';
import styles from '../../styles/Draggable/DraggableItem.module.scss';
import { useRef, useState } from 'react';

import useYTDLiveChatStore from '../../../../../stores/ytdLiveChatStore';
import { useShallow } from 'zustand/react/shallow';
import { DragIcon } from './DragIcon';
import { SettingIcon } from './SettingIcon';

interface DraggableItemType {
  top?: number;
  left?: number;
  children: React.ReactNode;
}
export const DraggableItem = ({ top = 0, left = 0, children }: DraggableItemType) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: 'wrapper',
  });
  const sizeRef = useRef(useYTDLiveChatStore.getState().size);
  const [size, setSize] = useState({
    width: sizeRef.current.width,
    height: sizeRef.current.height,
  });
  const { setSize: setSizeToStore } = useYTDLiveChatStore(
    useShallow((state) => ({ setSize: state.setSize })),
  );

  return (
    <Resizable
      defaultSize={size}
      minWidth={300}
      minHeight={400}
      enable={{
        top: false,
        right: true,
        bottom: true,
        left: false,
        topRight: false,
        bottomRight: true,
        bottomLeft: false,
        topLeft: false,
      }}
      className={styles['Resizable']}
      style={{
        transform: CSS.Translate.toString(transform),
        top,
        left,
      }}
      bounds={'window'}
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onResizeStop={(event, direction, ref, d) => {
        if (event instanceof MouseEvent) {
          if (event.target instanceof HTMLElement) {
            setSize({ width: size.width + d.width, height: size.height + d.height });
            setSizeToStore({ width: size.width + d.width, height: size.height + d.height });
          }
        }
      }}
    >
      <div
        className={classNames(styles['Container'], isDragging && styles['dragging'])}
        ref={setNodeRef}
      >
        <div
          className={classNames(styles['dragButton'], isDragging && styles['dragging'])}
          {...attributes}
          {...listeners}
        >
          <DragIcon />
        </div>
        <div className={styles['settingButton']}>
          <SettingIcon />
        </div>
        <div className={styles['children']}>{children}</div>
      </div>
    </Resizable>
  );
};
