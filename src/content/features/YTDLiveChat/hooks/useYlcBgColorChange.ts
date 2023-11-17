import { useCallback, useEffect, useRef, useState } from 'react';
import { useYTDLiveChatStore } from '../../../../stores';
import { darkenHexColor, decimalToHex } from '../utils/hexUtils';

const propertyList: string[] = [
  '--yt-live-chat-background-color',
  '--yt-live-chat-message-highlight-background-color',
];
const propertyListDarken = [
  { property: '--yt-spec-icon-disabled', amount: 40 },
  { property: '--yt-live-chat-vem-background-color', amount: 15 },
];
const propertyListTransparent = [
  '--yt-live-chat-header-background-color',
  '--yt-spec-general-background-b',
  '--yt-live-chat-action-panel-background-color',
  '--yt-live-chat-banner-gradient-scrim',
  '--yt-live-chat-action-panel-gradient-scrim',
];

export const useYLCBgColorChange = () => {
  const stateRef = useRef(useYTDLiveChatStore.getState());
  const [color, setColor] = useState<string>(
    `${stateRef.current.hex}${decimalToHex(stateRef.current.alpha || 0)}`,
  );
  const ref = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const element = document.querySelector('#my-extension-root iframe.ytd-live-chat-frame');
    if (element instanceof HTMLIFrameElement) {
      ref.current = element;
    }
  }, []);
  const changeIframeBackgroundColor = useCallback((color: string) => {
    if (ref.current && ref.current.contentWindow) {
      const document = ref.current.contentWindow.document.documentElement;
      propertyList.forEach((property) => {
        document.style.setProperty(property, color);
      });
      propertyListDarken.forEach((item) => {
        document.style.setProperty(item.property, darkenHexColor(color, item.amount));
      });
      propertyListTransparent.forEach((property) => {
        document.style.setProperty(property, 'transparent');
      });
    }
  }, []);
  const changeColor = useCallback(
    (hex: string, alpha: number | undefined) => {
      const hexCode = `${hex}${decimalToHex(alpha || 0)}`;
      changeIframeBackgroundColor(hexCode);
      setColor(hexCode);
    },
    [changeIframeBackgroundColor],
  );
  return { changeColor, color };
};
