export type Styles = {
  children: string;
  Container: string;
  dragButton: string;
  dragging: string;
  Resizable: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
