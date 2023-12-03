export type Styles = {
  content: string;
  'content-item': string;
  disable: string;
  footer: string;
  help: string;
  settings: string;
  title: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
