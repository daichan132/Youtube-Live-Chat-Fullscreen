import { useEffect, useRef, useState } from 'react';
import { ColorResult } from 'react-color';

const decimalToHex = (alpha: number) => (alpha === 0 ? '00' : Math.round(255 * alpha).toString(16));
function darkenHexColor(hex: string, amount: number) {
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);
  const a = hex.length > 7 ? parseInt(hex.substring(7, 9), 16) : 255;
  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);
  return '#' + [r, g, b, a].map((x) => x.toString(16).padStart(2, '0')).join('');
}
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
      propertyListDarken.forEach((item) => {
        document.style.setProperty(item.property, darkenHexColor(color, item.amount));
      });
      propertyListTransparent.forEach((property) => {
        document.style.setProperty(property, 'transparent');
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
