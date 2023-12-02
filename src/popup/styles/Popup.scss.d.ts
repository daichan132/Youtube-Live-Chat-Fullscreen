export type Styles = {
  content: string;
  'content-item': string;
  footer: string;
  help: string;
  settings: string;
  'title-with-icon': string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
