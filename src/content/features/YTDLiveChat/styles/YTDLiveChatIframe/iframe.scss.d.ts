export type Styles = {
  'always-on-display': string;
  chat: string;
  contents: string;
  'custom-yt-app-live-chat-extension': string;
  display: string;
  emoji: string;
  item: string;
  'item-scroller': string;
  items: string;
  'left-arrow-container': string;
  message: string;
  'panel-pages': string;
  'right-arrow-container': string;
  separator: string;
  title: string;
  'yt-dropdown-menu': string;
  'yt-emoji-picker-category-renderer': string;
  'yt-img-shadow': string;
  'yt-live-chat-banner-renderer': string;
  'yt-live-chat-item-list-renderer': string;
  'yt-live-chat-renderer': string;
  'yt-live-chat-text-message-renderer': string;
  'yt-live-chat-ticker-renderer': string;
  'yt-live-chat-toggle-renderer': string;
  'ytd-menu-navigation-item-renderer': string;
  'ytd-menu-popup-renderer': string;
  'ytd-menu-service-item-renderer': string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
