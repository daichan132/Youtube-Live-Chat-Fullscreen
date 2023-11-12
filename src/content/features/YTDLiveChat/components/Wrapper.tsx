import { DndContext, useDraggable } from '@dnd-kit/core';
import React, { useState } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { Resizable } from 're-resizable';
import { Coordinates } from '@dnd-kit/core/dist/types';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { RiDraggable } from 'react-icons/ri';

const defaultCoordinates = {
  x: 0,
  y: 0,
};

interface Wrapper {
  children: React.ReactNode;
}

export const Wrapper = ({ children }: Wrapper) => {
  const [{ x, y }, setCoordinates] = useState<Coordinates>(defaultCoordinates);

  return (
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
  );
};

interface DraggableItemType {
  top?: number;
  left?: number;
  children: React.ReactNode;
}
const DraggableItem = ({ top = 0, left = 0, children }: DraggableItemType) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'wrapper',
  });
  return (
    <Resizable
      defaultSize={{ width: 400, height: 500 }}
      minWidth={300}
      minHeight={400}
      style={{
        position: 'absolute',
        zIndex: 100000,
        transform: CSS.Translate.toString(transform),
        top,
        left,
      }}
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
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 0, 0, 0.1)',
        }}
        ref={setNodeRef}
      >
        <div
          style={{
            position: 'absolute',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            zIndex: 1,
            right: 48,
            top: 4,
          }}
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
