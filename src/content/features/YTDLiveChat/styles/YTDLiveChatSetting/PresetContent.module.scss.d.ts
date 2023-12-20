export type Styles = {
  blue: string;
  cardContainer: string;
  colorBar: string;
  colorSection: string;
  "content-preset-container": string;
  dragging: string;
  dragIcon: string;
  flex: string;
  leftContainer: string;
  red: string;
  rightContainer: string;
  title: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
