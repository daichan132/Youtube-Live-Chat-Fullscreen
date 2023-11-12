import { useEffect, useRef, useState } from 'react';
import style from '../styles/iframe.css?inline';

interface YTDLiveChatIframe {
  src: string;
}

export const YTDLiveChatIframe = ({ src }: YTDLiveChatIframe) => {
  const ref = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState<boolean>(false);
  useEffect(() => {
    if (ref.current) {
      ref.current.onload = () => {
        const doc = ref.current?.contentDocument;
        if (doc) {
          const styleElement = document.createElement('style');
          styleElement.textContent = style;
          doc.head.appendChild(styleElement);
          setLoaded(true);
        }
      };
    }
  }, []);

  return (
    <>
      <iframe
        frameBorder={0}
        style={{
          width: '100%',
          height: '100%',
          opacity: loaded ? 1 : 0,
        }}
        id="chatframe"
        className="style-scope ytd-live-chat-frame"
        src={src}
        ref={ref}
      />
      {!loaded && (
        <div
          className="skeleton-loading"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            opacity: 0.8,
            filter: 'blur(4px)',
          }}
        />
      )}
    </>
  );
};
