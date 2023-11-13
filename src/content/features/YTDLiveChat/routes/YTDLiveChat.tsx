/* eslint-disable @typescript-eslint/no-explicit-any */
import { Wrapper } from '../components/Wrapper';
import { YTDLiveChatIframe } from '../components/YTDLiveChatIframe';
import { useIsShow } from '../hooks/useIsShow';

interface YTDLiveChatType {
  videoID: string;
}
export const YTDLiveChat = ({ videoID }: YTDLiveChatType) => {
  const isShow = useIsShow(videoID);

  return isShow ? (
    <Wrapper>
      <YTDLiveChatIframe src={`/live_chat?v=${videoID}`} />
    </Wrapper>
  ) : null;
};
