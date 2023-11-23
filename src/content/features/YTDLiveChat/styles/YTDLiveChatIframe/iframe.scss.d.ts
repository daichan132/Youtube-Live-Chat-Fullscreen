export type Styles = {
  chat: string;
  'custom-yt-app-live-chat-extension': string;
  emoji: string;
  item: string;
  'item-scroller': string;
  message: string;
  'reaction-control-panel': string;
  title: string;
  'yt-dropdown-menu': string;
  'yt-emoji-picker-category-renderer': string;
  'yt-live-chat-item-list-renderer': string;
  'yt-live-chat-text-message-renderer': string;
  'yt-live-chat-toggle-renderer': string;
  'yt-reaction-control-panel-overlay-view-model': string;
  'ytd-menu-navigation-item-renderer': string;
  'ytd-menu-popup-renderer': string;
  'ytd-menu-service-item-renderer': string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
