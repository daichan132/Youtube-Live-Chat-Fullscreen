export type Styles = {
  active: string;
  'close-button': string;
  container: string;
  content: string;
  'content-item': string;
  header: string;
  'settings-modal': string;
  sidebar: string;
  'sidebar-item': string;
  title: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
