/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';

interface EmojiFixType {
  textInputElement: Element;
}
export const EmojiFix = ({ textInputElement }: EmojiFixType) => {
  useEffect(() => {
    const changeImgAltText = (mutations: any) => {
      mutations.forEach((mutation: any) => {
        const imgNodes = Array.from(mutation.addedNodes).filter(
          (node: any) => node.tagName === 'IMG'
        );
        imgNodes.forEach((imgNode: any) => {
          imgNode.alt = ':' + imgNode.alt + ':';
        });
      });
    };
    const mutationObserver = new MutationObserver(changeImgAltText);
    mutationObserver.observe(textInputElement, { childList: true, subtree: true });
    return () => {
      mutationObserver.disconnect();
    };
  }, [textInputElement]);

  return null;
};
