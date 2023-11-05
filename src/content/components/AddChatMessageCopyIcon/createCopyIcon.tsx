/* eslint-disable @typescript-eslint/no-explicit-any */
import { CopyIcon } from './CopyIcon';
import { createRoot } from 'react-dom/client';
import emojiRegex from 'emoji-regex';

export const createCopyIcon = (chatMessageElement: Element) => {
  const ytIconButton = chatMessageElement.querySelector(
    'div#menu:not(.custom).yt-live-chat-text-message-renderer'
  );
  const message = chatMessageElement.querySelector(
    'span#message.yt-live-chat-text-message-renderer'
  );
  const parent = ytIconButton?.parentElement;
  if (!parent || !message || !(ytIconButton?.previousElementSibling?.id === 'content')) return;

  const copyIconRoot = document.createElement('div');
  copyIconRoot.id = 'menu';
  copyIconRoot.className = 'yt-live-chat-text-message-renderer custom';

  parent.insertBefore(copyIconRoot, ytIconButton);
  const text = Array.from(message.childNodes).reduce((acc, node: any) => {
    const regex = emojiRegex();
    if (regex.test(node.alt)) {
      return acc + node.alt;
    } else {
      if (node.nodeName === 'IMG') {
        return acc + (node as Element).getAttribute('shared-tooltip-text');
      } else {
        return acc + node.textContent;
      }
    }
  }, '');

  createRoot(copyIconRoot).render(<CopyIcon text={text} />);
  return null;
};
