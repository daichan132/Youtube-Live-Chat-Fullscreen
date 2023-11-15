import { useEffect, useRef, useState } from 'react';
import { ColorResult } from 'react-color';

const decimalToHex = (alpha: number) => (alpha === 0 ? '00' : Math.round(255 * alpha).toString(16));
const propertyList: string[] = [
  '--yt-live-chat-background-color',
  '--yt-live-chat-header-background-color',
  '--yt-live-chat-action-panel-background-color',
];

export const useYlcBgColorChange = () => {
  const [color, setColor] = useState<string>('#FFFFFF');
  const ref = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    const element = document.querySelector('#my-extension-root iframe.ytd-live-chat-frame');
    if (element instanceof HTMLIFrameElement) {
      ref.current = element;
    }
  }, []);
  const changeIframeBackgroundColor = (color: string) => {
    if (ref.current && ref.current.contentWindow) {
      const document = ref.current.contentWindow.document.documentElement;
      propertyList.forEach((property) => {
        document.style.setProperty(property, color);
      });
    }
  };
  const changeColor = (color: ColorResult) => {
    const hexCode = `${color.hex}${decimalToHex(color.rgb.a || 0)}`;
    changeIframeBackgroundColor(hexCode);
    setColor(hexCode);
  };
  return { changeColor, color };
};
