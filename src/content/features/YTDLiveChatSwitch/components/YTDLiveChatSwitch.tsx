import { useYtdLiveChat } from "@/content/hooks/globalState/useYtdLiveChat";
import { useCallback } from "react";
import { IoChatboxSharp } from "react-icons/io5";
import styles from "../styles/YTDLiveChatSwitch.module.css"

export const YTDLiveChatSwitch = () => {
  const [ytdLiveChat, setYTDLiveChat] = useYtdLiveChat()
  const handleClick = useCallback(() => {
    const newYtdLiveChat = !ytdLiveChat;
    setYTDLiveChat(newYtdLiveChat);
  }, [ytdLiveChat, setYTDLiveChat]);


  return (
    <button
      type="button"
      className={`ytp-button ${styles.button}`}
      aria-pressed={ytdLiveChat}
      onClick={handleClick}
      onKeyUp={() => { }}
    >
      <IoChatboxSharp
        size={"50%"}
        className={styles.icon}
      />
    </button>
  );
};
