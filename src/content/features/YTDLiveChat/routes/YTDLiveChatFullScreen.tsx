/* eslint-disable @typescript-eslint/no-explicit-any */
import { Wrapper } from '../components/Wrapper';
import { YTDLiveChatIframe } from '../components/YTDLiveChatIframe';

interface YTDLiveChatType {
  videoID: string;
}
export const YTDLiveChat = ({ videoID }: YTDLiveChatType) => {
  return (
    <>
      {/* Not shown during Youtube live archived videos. */}
      <Wrapper>
        <YTDLiveChatIframe src={`/live_chat?v=${videoID}`} />
      </Wrapper>
    </>
  );
};
