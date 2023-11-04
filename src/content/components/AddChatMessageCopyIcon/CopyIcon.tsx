import React from 'react';
import { BiCopy } from 'react-icons/bi';
import { useCopyToClipboard } from 'react-use';

interface CopyIconType {
  text: string;
}
export const CopyIcon = ({ text }: CopyIconType) => {
  const [state, copyToClipboard] = useCopyToClipboard();
  return <BiCopy size={16} onClick={() => copyToClipboard(text)} />;
};
