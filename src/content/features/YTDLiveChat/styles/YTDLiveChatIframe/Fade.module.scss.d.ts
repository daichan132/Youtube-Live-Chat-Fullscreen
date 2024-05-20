export type Styles = {
  enter: string;
  enterActive: string;
  exit: string;
  exitActive: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
