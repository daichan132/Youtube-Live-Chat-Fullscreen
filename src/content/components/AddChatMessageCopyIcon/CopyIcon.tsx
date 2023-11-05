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
    <div>
      {copied ? (
        <BiCheckSquare id="clicked" size={20} />
      ) : (
        <BiCopy
          size={20}
          onClick={() => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            window.clearTimeout(copyTimeout!);
            setCopyTimeout(window.setTimeout(() => setCopied(false), 2000));
            copyToClipboard(text);
            setCopied(true);
          }}
        />
      )}
    </div>
  );
};
