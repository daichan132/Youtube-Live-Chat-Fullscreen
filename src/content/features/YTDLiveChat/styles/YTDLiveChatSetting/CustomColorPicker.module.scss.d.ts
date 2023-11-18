export type Styles = {
  'color-display': string;
  'color-picker': string;
  'color-picker-wrapper': string;
  'color-preview': string;
  'color-preview-background': string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
