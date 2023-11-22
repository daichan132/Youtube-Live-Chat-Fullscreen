import { useCallback, useEffect, useRef } from 'react';
import { RGBColor } from 'react-color';

const propertyList: string[] = [
  '--yt-live-chat-primary-text-color',
  '--yt-live-chat-text-input-field-placeholder-color',
  '--yt-spec-text-primary',
];

export const useYLCFontColorChange = () => {
  const ref = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const element = document.querySelector('#my-extension-root iframe.ytd-live-chat-frame');
    if (element instanceof HTMLIFrameElement) {
      ref.current = element;
    }
  }, []);
  const changeIframeFontColor = useCallback((rgba: RGBColor) => {
    if (ref.current && ref.current.contentWindow) {
      const document = ref.current.contentWindow.document.documentElement;
      propertyList.forEach((property) => {
        document.style.setProperty(property, `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`);
      });
      document.style.setProperty(
        '--yt-live-chat-secondary-text-color',
        `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${Math.max(0, (rgba.a || 0) - 0.4)})`,
      );
    }
  }, []);
  const changeColor = useCallback(
    (rgba: RGBColor) => {
      changeIframeFontColor(rgba);
    },
    [changeIframeFontColor],
  );
  return { changeColor };
};
