/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { createCopyIcon } from './createCopyIcon';

interface AddChatMessageCopyIconType {
  element: Element;
}

export const AddChatMessageCopyIcon = ({ element }: AddChatMessageCopyIconType) => {
  useEffect(() => {
    const chatMessageElements = Array.from(element.children).filter(
      (node) => node.nodeName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER'
    );
    chatMessageElements.forEach((chatMessageElement) => {
      createCopyIcon(chatMessageElement);
    });

    const addChatMessageCopyIcon = (mutations: any) => {
      mutations.forEach((mutation: any) => {
        const filteredNodes = Array.from(mutation.addedNodes).filter(
          (node: any) => node.nodeName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER'
        );
        filteredNodes.forEach((chatMessageElement: any) => {
          createCopyIcon(chatMessageElement);
        });
      });
    };
    const mutationObserver = new MutationObserver(addChatMessageCopyIcon);
    mutationObserver.observe(element, { childList: true });
    return () => {
      mutationObserver.disconnect();
    };
  }, [element]);

  return null;
};
