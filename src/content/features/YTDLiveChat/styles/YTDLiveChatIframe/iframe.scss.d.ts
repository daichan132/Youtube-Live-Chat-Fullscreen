export type Styles = {
  'always-on-display': string;
  chat: string;
  contents: string;
  'custom-yt-app-live-chat-extension': string;
  display: string;
  emoji: string;
  item: string;
  'item-scroller': string;
  message: string;
  'panel-pages': string;
  'reaction-control-panel': string;
  separator: string;
  title: string;
  'yt-dropdown-menu': string;
  'yt-emoji-picker-category-renderer': string;
  'yt-live-chat-item-list-renderer': string;
  'yt-live-chat-renderer': string;
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
