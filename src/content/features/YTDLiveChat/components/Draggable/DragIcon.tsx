import React from 'react';
import { RiDraggable } from 'react-icons/ri';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';

export const DragIcon = () => {
  const { fontColor: rgba } = useYTDLiveChatStore(
    useShallow((state) => ({ fontColor: state.fontColor })),
  );

  return <RiDraggable size={24} color={`rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`} />;
};
