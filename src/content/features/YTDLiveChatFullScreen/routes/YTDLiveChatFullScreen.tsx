/* eslint-disable @typescript-eslint/no-explicit-any */
import { DndContext } from '@dnd-kit/core';
import { YTDLiveChatIframe } from '../components/YTDLiveChatIframe';
import { useYTDLiveChatSrc } from '../hooks/useYTDLiveChatSrc';
import type { Coordinates } from '@dnd-kit/utilities';
import { useState } from 'react';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

const defaultCoordinates = {
  x: 0,
  y: 0,
};

export const YTDLiveChatFullScreen = () => {
  const ytdLiveChatSrc = useYTDLiveChatSrc();
  const [{ x, y }, setCoordinates] = useState<Coordinates>(defaultCoordinates);

  return (
    <>
      {/* Not shown during Youtube live archived videos. */}
      {ytdLiveChatSrc && ytdLiveChatSrc.indexOf('/live_chat_replay') === -1 ? (
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
          <YTDLiveChatIframe ytdLiveChatSrc={ytdLiveChatSrc} style={{ top: y, left: x }} />
        </DndContext>
      ) : null}
    </>
  );
};
