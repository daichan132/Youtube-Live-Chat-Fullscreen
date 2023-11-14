export type Styles = {
  custom: string;
  menu: string;
  tooltip: string;
  'tooltip-text': string;
  'yt-live-chat-item-list-renderer': string;
  'yt-live-chat-text-message-renderer': string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
