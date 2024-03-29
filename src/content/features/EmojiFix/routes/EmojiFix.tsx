/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

import { useYTLabelTextObserve } from '../../../hooks/useYTLabelTextObserve';
import { changeImgAlt } from '../utils/changeImgAlt';

export const EmojiFix = () => {
  const [textInputElement, setTextInputElement] = useState<Element | null>(null);
  const labelText = useYTLabelTextObserve();
  useEffect(() => {
    const element = document.body.querySelector('yt-live-chat-text-input-field-renderer');
    if (!element) return;
    const contentEditable = Array.from(element.children).find(
      (child) => (child as HTMLElement).contentEditable === 'true',
    ) as HTMLElement | undefined;
    if (!contentEditable) return;
    setTextInputElement(contentEditable);
  }, [labelText]);

  useEffect(() => {
    if (!textInputElement) return;
    const changeImgAltText = (mutations: any) => {
      mutations.forEach((mutation: any) => {
        const imgNodes = Array.from(mutation.addedNodes).filter(
          (node: any) => node.tagName === 'IMG',
        );
        imgNodes.forEach((imgNode: any) => {
          changeImgAlt(imgNode);
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
