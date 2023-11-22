export type Styles = {
  'close-button': string;
  content: string;
  'content-item': string;
  header: string;
  menu: string;
  'menu-item': string;
  settings: string;
  'title-with-icon': string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
