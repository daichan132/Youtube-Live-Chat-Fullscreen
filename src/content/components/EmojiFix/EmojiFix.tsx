/* eslint-disable @typescript-eslint/no-explicit-any */
import emojiRegex from 'emoji-regex';
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
          const regex = emojiRegex();
          const replacedAlt = imgNode.alt.replace(regex, '');
          if (!replacedAlt) return;
          if (imgNode.dataset.emojiId.indexOf('UCkszU2WH9gy1mb0dV-11UJg/') !== -1) {
            /* ---------------------------- Youtube固有の絵文字の場合 ---------------------------- */
            imgNode.alt = ':' + imgNode.alt + ':';
          } else {
            /* ---------------------------- メンバーシップ専用の絵文字の場合 ---------------------------- */
            imgNode.alt = ':_' + imgNode.alt + ':';
          }
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
