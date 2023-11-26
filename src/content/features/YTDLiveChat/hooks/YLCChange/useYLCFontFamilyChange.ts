import { useCallback, useEffect, useRef } from 'react';

export const useYLCFontFamilyChange = () => {
  const ref = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const element = document.querySelector('#my-extension-root iframe.ytd-live-chat-frame');
    if (element instanceof HTMLIFrameElement) {
      ref.current = element;
    }
  }, []);

  const importFont = useCallback((fontFamily: string) => {
    if (ref.current?.contentWindow) {
      const fontUrl = `@import url('https://fonts.googleapis.com/css2?family=${fontFamily.replace(
        /\s+/g,
        '+',
      )}:wght@400;500&display=swap');`;
      const existingStyleElement =
        ref.current.contentWindow.document.head.querySelector('#custom-font-style');
      if (existingStyleElement) {
        existingStyleElement.textContent = fontUrl;
      } else {
        const styleElement = document.createElement('style');
        styleElement.id = 'custom-font-style';
        styleElement.textContent = fontUrl;
        ref.current.contentWindow.document.head.appendChild(styleElement);
      }
    }
  }, []);

  const changeIframeFontFamily = useCallback((fontFamily: string) => {
    if (ref.current?.contentWindow) {
      const document = ref.current.contentWindow.document.documentElement;
      document.style.setProperty('font-family', `${fontFamily}, Roboto, Arial, sans-serif`);
    }
  }, []);

  const changeFontFamily = useCallback(
    (fontFamily: string) => {
      importFont(fontFamily);
      changeIframeFontFamily(fontFamily);
    },
    [importFont, changeIframeFontFamily],
  );

  return { changeFontFamily };
};
