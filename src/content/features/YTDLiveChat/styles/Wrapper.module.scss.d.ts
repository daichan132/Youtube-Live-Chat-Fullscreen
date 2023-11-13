export type Styles = {
  button: string;
  Container: string;
  dragging: string;
  Resizable: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
