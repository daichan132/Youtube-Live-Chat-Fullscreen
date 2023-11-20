import { DndContext } from '@dnd-kit/core';
import React from 'react';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import styles from '../../styles/Draggable/Draggable.module.scss';
import { DraggableItem } from './DraggableItem';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';

interface DraggableType {
  children: React.ReactNode;
}

export const Draggable = ({ children }: DraggableType) => {
  const {
    coordinates: { x, y },
    setCoordinates,
  } = useYTDLiveChatStore(
    useShallow((state) => ({
      coordinates: state.coordinates,
      setCoordinates: state.setCoordinates,
    })),
  );
  return (
    <div className={styles['RestrictWindow']}>
      <DndContext
        onDragEnd={({ delta }) => {
          setCoordinates({
            x: x + delta.x,
            y: y + delta.y,
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
