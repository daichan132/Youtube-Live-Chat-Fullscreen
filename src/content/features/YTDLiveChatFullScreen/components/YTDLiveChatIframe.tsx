import { useDraggable } from '@dnd-kit/core';
import React, { useRef } from 'react';
import { CSS } from '@dnd-kit/utilities';

interface YTDLiveChatIframe {
  ytdLiveChatSrc: string;
  style?: React.CSSProperties;
}

export const YTDLiveChatIframe = ({ ytdLiveChatSrc, style }: YTDLiveChatIframe) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: ytdLiveChatSrc,
  });
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // console.log(iframeRef.current?.contentWindow?.document);
  return (
    <div
      style={{
        ...style,
        position: 'absolute',
        zIndex: 100000,
        width: '500px',
        transform: CSS.Translate.toString(transform),
      }}
      ref={setNodeRef}
    >
      <button
        style={{ height: '20px', backgroundColor: 'gray', width: '100%' }}
        {...attributes}
        {...listeners}
      />
      <iframe
        ref={iframeRef}
        frameBorder={0}
        style={{
          width: '100%',
          height: '500px',
          // display: 'none',
        }}
        id="chatframe"
        className="style-scope ytd-live-chat-frame"
        src={ytdLiveChatSrc}
      />
    </div>
  );
};
