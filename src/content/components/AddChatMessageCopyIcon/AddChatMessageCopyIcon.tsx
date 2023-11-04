/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { CopyIcon } from './CopyIcon';
import { createRoot } from 'react-dom/client';

interface AddChatMessageCopyIconType {
  element: Element;
}

export const createCopyIcon = (chatMessageElement: Element) => {
  const ytIconButton = chatMessageElement.querySelector('yt-icon-button');
  const message = chatMessageElement.querySelector(
    'span#message.yt-live-chat-text-message-renderer'
  );
  const parent = ytIconButton?.parentElement;
  if (!parent || !message || ytIconButton?.previousElementSibling) return;

  const newNode = document.createElement('div');
  newNode.className = 'chrome-extension-message-copy';
  parent.insertBefore(newNode, ytIconButton);
  const text = Array.from(message.childNodes).reduce((acc, node) => {
    if (node.nodeName === 'IMG') {
      return acc + (node as Element).getAttribute('shared-tooltip-text');
    } else {
      return acc + node.textContent;
    }
  }, '');
  createRoot(newNode).render(<CopyIcon text={text} />);
  return null;
};

export const AddChatMessageCopyIcon = ({ element }: AddChatMessageCopyIconType) => {
  useEffect(() => {
    const chatMessageElements = Array.from(element.children).filter(
      (node) => node.nodeName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER'
    );
    chatMessageElements.forEach((chatMessageElement) => {
      createCopyIcon(chatMessageElement);
    });
  }, [element]);

  useEffect(() => {
    const addChatMessageCopyIcon = (mutations: any) => {
      mutations.forEach((mutation: any) => {
        const filteredNodes = Array.from(mutation.addedNodes).filter(
          (node: any) => node.nodeName === 'YT-LIVE-CHAT-TEXT-MESSAGE-RENDERER'
        );
        filteredNodes.forEach((node: any) => {
          createCopyIcon(node);
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
