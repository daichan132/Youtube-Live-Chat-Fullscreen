import { CSS } from '@dnd-kit/utilities';
import { Resizable } from 're-resizable';
import classNames from 'classnames';
import { useDraggable } from '@dnd-kit/core';
import styles from '../../styles/Draggable/DraggableItem.module.scss';

import useYTDLiveChatStore from '../../../../../stores/ytdLiveChatStore';
import { useShallow } from 'zustand/react/shallow';
import { DragIcon } from './DragIcon';
import { SettingIcon } from './SettingIcon';
import { useYTDLiveChatNoLsStore } from '../../../../../stores/ytdLiveChatNoLsStore';
import { useEffect, useState } from 'react';
import { useClipPathHandle } from '../../hooks/useClipPathHandle';
import { bottomClip, topClip } from '../../utils/clipPathConst';

const enable = {
  top: false,
  right: true,
  bottom: true,
  left: false,
  topRight: false,
  bottomRight: true,
  bottomLeft: false,
  topLeft: false,
};
interface DraggableItemType {
  top?: number;
  left?: number;
  children: React.ReactNode;
}
export const DraggableItem = ({ top = 0, left = 0, children }: DraggableItemType) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: 'wrapper',
  });
  const [isResizing, setResiziging] = useState(false);
  const { size, alwaysOnDisplay, setSize } = useYTDLiveChatStore(
    useShallow((state) => ({
      size: state.size,
      alwaysOnDisplay: state.alwaysOnDisplay,
      setSize: state.setSize,
    })),
  );
  const { isDisplay } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({ isDisplay: state.isDisplay })),
  );
  const { clipPath } = useClipPathHandle(isDisplay, isDragging, alwaysOnDisplay);
  const [disableTopTransition, setDisableTopTransition] = useState(true);
  useEffect(() => {
    if (isDragging) {
      setDisableTopTransition(true);
    } else {
      const timeoutId = setTimeout(() => {
        setDisableTopTransition(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [isDragging]);

  return (
    <Resizable
      size={size}
      minWidth={300}
      minHeight={400}
      enable={enable}
      className={styles['Resizable']}
      style={{
        transform: CSS.Translate.toString(transform),
        top,
        left,
        clipPath: clipPath
          ? `inset(${topClip}px 0 ${bottomClip}px 0 round 10px)`
          : 'inset(0 round 10px)',
        transition: `clip-path 200ms ease, ${!disableTopTransition && 'top 200ms ease'}, ${
          !isResizing && 'height 200ms ease'
        }`,
      }}
      bounds={'window'}
      onResizeStop={(event, direction, ref, d) => {
        setResiziging(false);
        if (event instanceof MouseEvent) {
          if (event.target instanceof HTMLElement) {
            setSize({ width: size.width + d.width, height: size.height + d.height });
          }
        }
      }}
      onResizeStart={() => setResiziging(true)}
    >
      <div className={classNames(styles['Container'])} ref={setNodeRef}>
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
