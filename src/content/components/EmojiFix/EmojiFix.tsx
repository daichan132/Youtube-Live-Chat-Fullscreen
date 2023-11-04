/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { changeImgAlt } from '../../../utils/changeImgAlt';

interface EmojiFixType {
  element: Element;
}
export const EmojiFix = ({ element }: EmojiFixType) => {
  useEffect(() => {
    const changeImgAltText = (mutations: any) => {
      mutations.forEach((mutation: any) => {
        const imgNodes = Array.from(mutation.addedNodes).filter(
          (node: any) => node.tagName === 'IMG'
        );
        imgNodes.forEach((imgNode: any) => {
          changeImgAlt(imgNode);
        });
      });
    };
    const mutationObserver = new MutationObserver(changeImgAltText);
    mutationObserver.observe(element, { childList: true, subtree: true });
    return () => {
      mutationObserver.disconnect();
    };
  }, [element]);

  return null;
};
