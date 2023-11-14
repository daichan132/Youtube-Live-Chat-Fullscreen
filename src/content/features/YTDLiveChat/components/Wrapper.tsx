import { DndContext, useDraggable } from '@dnd-kit/core';
import React, { useState } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { Resizable } from 're-resizable';
import { Coordinates } from '@dnd-kit/core/dist/types';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { RiDraggable } from 'react-icons/ri';
import classNames from 'classnames';
import styles from '../styles/Wrapper.module.scss';

const defaultCoordinates = {
  x: 20,
  y: 20,
};

interface Wrapper {
  children: React.ReactNode;
}

export const Wrapper = ({ children }: Wrapper) => {
  const [{ x, y }, setCoordinates] = useState<Coordinates>(defaultCoordinates);
  return (
    <div className={styles['RestrictWindow']}>
      <DndContext
        onDragEnd={({ delta }) => {
          setCoordinates(({ x, y }) => {
            return {
              x: x + delta.x,
              y: y + delta.y,
            };
          });
        }}
        modifiers={[restrictToWindowEdges]}
      >
        <DraggableItem top={y} left={x}>
          {children}
        </DraggableItem>
      </DndContext>
    </div>
  );
};

interface DraggableItemType {
  top?: number;
  left?: number;
  children: React.ReactNode;
}
const DraggableItem = ({ top = 0, left = 0, children }: DraggableItemType) => {
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
    >
      <div
        className={classNames(styles['Container'], isDragging && styles['dragging'])}
        ref={setNodeRef}
      >
        <div
          className={classNames(styles['button'], isDragging && styles['dragging'])}
          {...attributes}
          {...listeners}
        >
          <RiDraggable size={24} style={{ padding: 7 }} />
        </div>
        <div
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          {children}
        </div>
      </div>
    </Resizable>
  );
};
