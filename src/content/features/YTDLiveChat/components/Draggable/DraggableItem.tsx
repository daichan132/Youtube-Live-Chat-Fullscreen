import { CSS } from '@dnd-kit/utilities';
import { Resizable } from 're-resizable';
import { RiDraggable } from 'react-icons/ri';
import classNames from 'classnames';
import { useDraggable } from '@dnd-kit/core';
import styles from '../../styles/Draggable/DraggableItem.module.scss';
import { useRef, useState } from 'react';
import { CiSettings } from 'react-icons/ci';
import Modal from 'react-modal';
import { YTDLiveChatSetting } from '../YTDLiveChatSetting/YTDLiveChatSetting';
import useYTDLiveChatStore from '../../../../../stores/ytdLiveChatStore';
import { useShallow } from 'zustand/react/shallow';

const customStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    padding: 0,
    outline: 'none',
    border: 'none',
    zIndex: 10,
    backgroundColor: 'transparent',
    overflow: 'none',
  },
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
  const [isOpen, setIsOpen] = useState<boolean>(false);
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
          <RiDraggable size={24} />
        </div>
        <div className={styles['settingButton']}>
          <CiSettings
            size={24}
            onClick={() => {
              setIsOpen((a) => !a);
            }}
          />
          <Modal
            closeTimeoutMS={200}
            isOpen={isOpen}
            style={customStyles}
            shouldCloseOnOverlayClick={true}
            onRequestClose={() => setIsOpen(false)}
            appElement={document.getElementById('my-extension-root') || undefined}
          >
            <YTDLiveChatSetting setIsOpen={setIsOpen} />
          </Modal>
        </div>
        <div className={styles['children']}>{children}</div>
      </div>
    </Resizable>
  );
};
