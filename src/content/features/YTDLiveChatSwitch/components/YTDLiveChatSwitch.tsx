import { useYtdLiveChat } from "@/content/hooks/globalState/useYtdLiveChat";
import { useCallback } from "react";
import { IoChatboxSharp } from "react-icons/io5";

export const YTDLiveChatSwitch = () => {
  const [ytdLiveChat, setYTDLiveChat] = useYtdLiveChat()
  const handleClick = useCallback(() => {
    const newYtdLiveChat = !ytdLiveChat;
    setYTDLiveChat(newYtdLiveChat);
  }, [ytdLiveChat, setYTDLiveChat]);


  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        position: "relative",
      }}
      onClick={handleClick}
      onKeyUp={() => { }}
    >
      <IoChatboxSharp
        size={"60%"}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
};
