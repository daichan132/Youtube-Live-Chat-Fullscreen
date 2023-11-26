import { useCallback, useEffect, useRef } from 'react';
import { darkenRgbaColor } from '../../utils/darkenRgbaColor';
import { RGBColor } from 'react-color';

const propertyList: string[] = ['--yt-live-chat-background-color'];
const propertyListDarken = [
  { property: '--yt-spec-icon-disabled', amount: 40 },
  { property: '--yt-live-chat-vem-background-color', amount: 20 },
];
const propertyListTransparent = [
  '--yt-live-chat-header-background-color',
  '--yt-spec-general-background-b',
  '--yt-live-chat-action-panel-background-color',
  '--yt-live-chat-banner-gradient-scrim',
  '--yt-live-chat-action-panel-gradient-scrim',
  '--yt-live-chat-message-highlight-background-color',
];

export const useYLCBgColorChange = () => {
  const ref = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const element = document.querySelector('#my-extension-root iframe.ytd-live-chat-frame');
    if (element instanceof HTMLIFrameElement) {
      ref.current = element;
    }
  }, []);
  const changeIframeBackgroundColor = useCallback((rgba: RGBColor) => {
    if (ref.current?.contentWindow) {
      const document = ref.current.contentWindow.document.documentElement;
      propertyList.forEach((property) => {
        document.style.setProperty(property, `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`);
      });
      propertyListDarken.forEach((item) => {
        document.style.setProperty(item.property, darkenRgbaColor(rgba, item.amount));
      });
      propertyListTransparent.forEach((property) => {
        document.style.setProperty(property, 'transparent');
      });
    }
  }, []);
  const changeColor = useCallback(
    (rgba: RGBColor) => {
      changeIframeBackgroundColor(rgba);
    },
    [changeIframeBackgroundColor],
  );
  return { changeColor };
};
