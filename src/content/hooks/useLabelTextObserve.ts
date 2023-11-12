/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const useLabelTextObserve = () => {
  const [labelText, setLabelText] = useState('');

  useEffect(() => {
    const element = document.body.querySelector('span#view-selector.yt-live-chat-header-renderer');
    if (!element) return;
    const handleLabelTextChanged = (mutations: any) => {
      mutations.forEach(async (mutation: any) => {
        if (mutation.target.parentElement.id === 'label-text') {
          await sleep(1000);
          setLabelText(mutation.target.textContent);
        }
      });
    };
    const mutationObserver = new MutationObserver(handleLabelTextChanged);
    mutationObserver.observe(element, { characterData: true, subtree: true });
    return () => {
      mutationObserver.disconnect();
    };
  }, []);

  return labelText;
};
