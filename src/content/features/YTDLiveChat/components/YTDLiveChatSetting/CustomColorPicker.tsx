import { ChromePicker } from 'react-color';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import { useYLCBgColorChange } from '../../hooks/useYLCBgColorChange';

export const CustomColorPicker = () => {
  const { color, changeColor } = useYLCBgColorChange();
  const { setHex: setHexToStore, setAlpha: setAlphaToStore } = useYTDLiveChatStore(
    useShallow((state) => ({ setHex: state.setHex, setAlpha: state.setAlpha })),
  );
  return (
    <ChromePicker
      color={color}
      onChange={(c) => {
        changeColor(c.hex, c.rgb.a);
      }}
      onChangeComplete={(c) => {
        setHexToStore(c.hex);
        if (c.rgb.a) setAlphaToStore(c.rgb.a);
      }}
      styles={{
        default: {
          picker: {
            boxShadow: 'none',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            width: '80%',
          },
        },
      }}
    />
  );
};
