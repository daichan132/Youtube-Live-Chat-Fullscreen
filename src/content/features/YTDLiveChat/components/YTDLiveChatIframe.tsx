import { useEffect, useRef } from 'react';

interface YTDLiveChatIframe {
  src: string;
}

export const YTDLiveChatIframe = ({ src }: YTDLiveChatIframe) => {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    console.log('reload');
    ref.current?.contentDocument?.location.reload();
  }, [src]);
  return (
    <iframe
      style={{
        width: '100%',
        height: 'calc(100% - 20px)',
        // display: 'none',
      }}
      id="chatframe"
      className="style-scope ytd-live-chat-frame"
      src={src}
      ref={ref}
    />
  );
};
