import { useState } from 'react';
import { BiCheckSquare, BiCopy } from 'react-icons/bi';
import { useCopyToClipboard } from 'react-use';

interface CopyIconType {
  text: string;
}
export const CopyIcon = ({ text }: CopyIconType) => {
  const [, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState<boolean>(false);
  const [copyTimeout, setCopyTimeout] = useState<number | null>(null);

  return (
    <div
      className="tooltip"
      onClick={() => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        window.clearTimeout(copyTimeout!);
        setCopyTimeout(window.setTimeout(() => setCopied(false), 2000));
        copyToClipboard(text);
        setCopied(true);
      }}
    >
      {copied ? (
        <>
          <span className="tooltip-text">Copied</span>
          <BiCheckSquare id="clicked" size={20} />
        </>
      ) : (
        <>
          <span className="tooltip-text">Copy</span>
          <BiCopy size={20} />
        </>
      )}
    </div>
  );
};
