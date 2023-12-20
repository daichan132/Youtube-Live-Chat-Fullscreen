import type { Coordinates } from '@dnd-kit/core/dist/types';
import type { RGBColor } from 'react-color';

export interface sizeType {
  width: number;
  height: number;
}

export interface YLCStyleType {
  bgColor: RGBColor;
  fontColor: RGBColor;
  fontFamily: string;
  fontSize: number;
  blur: number;
  space: number;
  size: sizeType;
  coordinates: Coordinates;
  alwaysOnDisplay: boolean;
  chatOnlyDisplay: boolean;
  userNameDisplay: boolean;
  userIconDisplay: boolean;
  reactionButtonDisplay: boolean;
}
export const ylcInitSetting: YLCStyleType = {
  bgColor: { r: 255, g: 255, b: 255, a: 1 },
  fontColor: { r: 0, g: 0, b: 0, a: 1 },
  fontFamily: '',
  fontSize: 13,
  blur: 0,
  space: 0,
  size: { width: 400, height: 500 },
  coordinates: { x: 20, y: 20 },
  alwaysOnDisplay: false,
  chatOnlyDisplay: false,
  userNameDisplay: true,
  userIconDisplay: true,
  reactionButtonDisplay: true,
};
