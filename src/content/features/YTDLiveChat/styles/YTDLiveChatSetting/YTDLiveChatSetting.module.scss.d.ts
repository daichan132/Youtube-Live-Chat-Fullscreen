export type Styles = {
  'close-button': string;
  'content': string;
  'footer': string;
  'header': string;
  'help': string;
  'menu': string;
  'menu-item': string;
  'selected-menu-item': string;
  'settings': string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
