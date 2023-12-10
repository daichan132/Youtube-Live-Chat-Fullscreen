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
import { useState } from 'react';
import { useDisanleTopTransition } from '../../hooks/Draggable/useDisanleTopTransition';
import { useHoverEvent } from '../../hooks/Draggable/useHoverEvent';
import { ClipPathEffect } from '../EffectComponent/ClipPathEffect';

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
  useHoverEvent(isDragging);
  const [isResizing, setResiziging] = useState(false);
  const { size, alwaysOnDisplay, setSize } = useYTDLiveChatStore(
    useShallow((state) => ({
      size: state.size,
      alwaysOnDisplay: state.alwaysOnDisplay,
      setSize: state.setSize,
    })),
  );
  const { isDisplay, isIframeLoaded, clip, isClipPath } = useYTDLiveChatNoLsStore(
    useShallow((state) => ({
      isDisplay: state.isDisplay,
      isIframeLoaded: state.isIframeLoaded,
      clip: state.clip,
      isClipPath: state.isClipPath,
    })),
  );
  const disableTopTransition = useDisanleTopTransition(isDragging);

  return (
    <>
      <ClipPathEffect isDragging={isDragging} isResizing={isResizing} />
      <Resizable
        size={size}
        minWidth={300}
        minHeight={350}
        enable={enable}
        className={styles['Resizable']}
        bounds={'window'}
        onResizeStop={(event, direction, ref, d) => {
          setResiziging(false);
          if (event instanceof MouseEvent) {
            if (event.target instanceof HTMLElement) {
              setSize({ width: size.width + d.width, height: size.height + d.height });
            }
          }
        }}
        style={{
          top,
          left,
          transition: `${!disableTopTransition && 'top 250ms ease'}, ${
            !isResizing && 'height 250ms ease'
          }`,
          pointerEvents: isClipPath ? 'none' : 'all',
        }}
        onResizeStart={() => setResiziging(true)}
      >
        <div
          className={classNames(styles['Container'])}
          style={{
            transform: CSS.Translate.toString(transform),
            clipPath: isClipPath
              ? `inset(${clip.header}px 0 ${clip.input}px 0 round 10px)`
              : 'inset(0 round 10px)',
            transition: 'clip-path 250ms ease',
          }}
          ref={setNodeRef}
        >
          <div
            className={classNames(styles['dragButton'], isDragging && styles['dragging'])}
            {...attributes}
            {...listeners}
            style={{ opacity: isIframeLoaded && (isDisplay || alwaysOnDisplay) ? 1 : 0 }}
          >
            <DragIcon />
          </div>
          <div
            className={styles['settingButton']}
            style={{ opacity: isIframeLoaded && (isDisplay || alwaysOnDisplay) ? 1 : 0 }}
          >
            <SettingIcon />
          </div>
          <div className={styles['children']}>
            {isDragging && <div className={styles['overlay']} />}
            {children}
          </div>
        </div>
      </Resizable>
    </>
  );
};
