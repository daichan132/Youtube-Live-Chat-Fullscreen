import { CSS } from '@dnd-kit/utilities';
import { Resizable } from 're-resizable';
import { RiDraggable } from 'react-icons/ri';
import classNames from 'classnames';
import { useDraggable } from '@dnd-kit/core';
import styles from '../../styles/Draggable/DraggableItem.module.scss';

interface DraggableItemType {
  top?: number;
  left?: number;
  children: React.ReactNode;
}
export const DraggableItem = ({ top = 0, left = 0, children }: DraggableItemType) => {
  const { attributes, isDragging, listeners, setNodeRef, transform } = useDraggable({
    id: 'wrapper',
  });
  return (
    <Resizable
      defaultSize={{ width: 400, height: 500 }}
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
        <div className={styles['children']}>{children}</div>
      </div>
    </Resizable>
  );
};
