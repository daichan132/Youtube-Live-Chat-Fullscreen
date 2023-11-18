export type Styles = {
  active: string;
  'close-button': string;
  content: string;
  'content-item': string;
  header: string;
  menu: string;
  'menu-item': string;
  settings: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
