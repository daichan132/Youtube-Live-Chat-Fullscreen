import { DndContext } from '@dnd-kit/core';
import React, { useRef, useState } from 'react';

import { Coordinates } from '@dnd-kit/core/dist/types';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

import styles from '../../styles/Draggable/Draggable.module.scss';
import { DraggableItem } from './DraggableItem';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';

interface DraggableType {
  children: React.ReactNode;
}

export const Draggable = ({ children }: DraggableType) => {
  const coordinatesRef = useRef(useYTDLiveChatStore.getState().coordinates);
  const [{ x, y }, setCoordinates] = useState<Coordinates>(coordinatesRef.current);
  const { setCoordinates: setCoordinatesToStore } = useYTDLiveChatStore(
    useShallow((state) => ({ setCoordinates: state.setCoordinates })),
  );
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
          setCoordinatesToStore({ x: x + delta.x, y: y + delta.y });
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
