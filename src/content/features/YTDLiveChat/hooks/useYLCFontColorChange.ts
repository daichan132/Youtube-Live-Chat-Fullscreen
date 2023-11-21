import { useCallback, useEffect, useRef, useState } from 'react';
import { useYTDLiveChatStore } from '../../../../stores';
import { RGBColor } from 'react-color';
import { useShallow } from 'zustand/react/shallow';

const propertyList: string[] = [
  '--yt-live-chat-primary-text-color',
  '--yt-live-chat-secondary-text-color',
  '--yt-live-chat-text-input-field-placeholder-color',
  '--yt-spec-text-primary',
];

export const useYLCFontColorChange = () => {
  const stateRef = useRef(useYTDLiveChatStore.getState());
  const [rgba, setRgba] = useState<RGBColor>(stateRef.current.fontColor);
  const ref = useRef<HTMLIFrameElement | null>(null);
  const { setFontColor: setFontColor } = useYTDLiveChatStore(
    useShallow((state) => ({ setFontColor: state.setFontColor })),
  );
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
    }
  }, []);
  const changeColor = useCallback(
    (rgba: RGBColor) => {
      changeIframeFontColor(rgba);
      setFontColor(rgba);
      setRgba(rgba);
    },
    [changeIframeFontColor, setFontColor],
  );
  return { changeColor, rgba };
};
