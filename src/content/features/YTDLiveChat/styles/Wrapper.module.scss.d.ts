export type Styles = {
  button: string;
  children: string;
  Container: string;
  dragging: string;
  Resizable: string;
  RestrictWindow: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
