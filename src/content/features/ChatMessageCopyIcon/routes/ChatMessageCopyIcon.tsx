/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

import { useYTLabelTextObserve } from '../../../hooks/useYTLabelTextObserve';
import { createCopyIcon } from '../utils/createCopyIcon';

export const AddChatMessageCopyIcon = () => {
  const [chatElement, setChatElement] = useState<Element | null>(null);
  const labelText = useYTLabelTextObserve();

  useEffect(() => {
    const element = document.body.querySelector('div#items.yt-live-chat-item-list-renderer');
    setChatElement(element);
  }, [labelText]);

  useEffect(() => {
    if (!chatElement) return;
    const chatMessageElements = Array.from(chatElement.children).filter(
      (node) => node.nodeName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER',
    );
    chatMessageElements.forEach((chatMessageElement) => {
      createCopyIcon(chatMessageElement);
    });

    const addChatMessageCopyIcon = (mutations: any) => {
      mutations.forEach((mutation: any) => {
        const filteredNodes = Array.from(mutation.addedNodes).filter(
          (node: any) => node.nodeName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER',
        );
        filteredNodes.forEach((chatMessageElement: any) => {
          createCopyIcon(chatMessageElement);
        });
      });
    };
    const mutationObserver = new MutationObserver(addChatMessageCopyIcon);
    mutationObserver.observe(chatElement, { childList: true });
    return () => {
      mutationObserver.disconnect();
    };
  }, [chatElement]);

  return null;
};
