import { IoLogoGithub } from "react-icons/io5";
import { FaProductHunt } from "react-icons/fa6";

export const Links = () => {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
    }}>
      <a href="https://chromewebstore.google.com/detail/youtube-live-chat-fullscr/dlnjcbkmomenmieechnmgglgcljhoepd" target="_blank" rel="noopener noreferrer">
        <img src="/images/extension_128.png" alt="extension icon" style={{ width: 26, height: 26 }} />
      </a>
      <a href="https://github.com/daichan132/Youtube-Live-Chat-Fullscreen" target="_blank" rel="noopener noreferrer">
        <IoLogoGithub size={28} style={{ color: "black" }} />
      </a>
      <a href="https://www.producthunt.com/products/youtube-live-chat-fullscreen" target="_blank" rel="noopener noreferrer">
        <FaProductHunt size={28} style={{ color: "#D9552E" }} />
      </a>
    </div>
  );
};
