export const decimalToHex = (alpha: number) =>
  alpha === 0 ? '00' : Math.round(255 * alpha).toString(16);
export const darkenHexColor = (hex: string, amount: number) => {
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);
  const a = hex.length > 7 ? parseInt(hex.substring(7, 9), 16) : 255;
  r = Math.max(0, r - amount);
  g = Math.max(0, g - amount);
  b = Math.max(0, b - amount);
  return '#' + [r, g, b, a].map((x) => x.toString(16).padStart(2, '0')).join('');
};
