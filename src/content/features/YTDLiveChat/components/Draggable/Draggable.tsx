import { DndContext } from '@dnd-kit/core';
import React, { useState } from 'react';

import { Coordinates } from '@dnd-kit/core/dist/types';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

import styles from '../../styles/Draggable/Draggable.module.scss';
import { DraggableItem } from './DraggableItem';

const defaultCoordinates = {
  x: 20,
  y: 20,
};

interface DraggableType {
  children: React.ReactNode;
}

export const Draggable = ({ children }: DraggableType) => {
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
