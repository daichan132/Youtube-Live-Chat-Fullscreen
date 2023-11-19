export type Styles = {
  'custom-yt-app-live-chat-extension': string;
  item: string;
  title: string;
  'yt-dropdown-menu': string;
  'yt-emoji-picker-category-renderer': string;
  'yt-live-chat-toggle-renderer': string;
  'ytd-menu-navigation-item-renderer': string;
  'ytd-menu-popup-renderer': string;
  'ytd-menu-service-item-renderer': string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
