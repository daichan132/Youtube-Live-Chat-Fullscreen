import { ChromePicker } from 'react-color';
import { useYTDLiveChatStore } from '../../../../../stores';
import { useShallow } from 'zustand/react/shallow';
import { useYLCBgColorChange } from '../../hooks/useYLCBgColorChange';
import { useRef, useState } from 'react';
import { useClickAway } from 'react-use';

export const CustomColorPicker = () => {
  const { rgba, changeColor } = useYLCBgColorChange();
  const { setRgba: setRgbaToStore } = useYTDLiveChatStore(
    useShallow((state) => ({ setRgba: state.setRgba })),
  );
  const [display, setDisplay] = useState(false);
  const ref = useRef(null);
  useClickAway(ref, () => {
    setDisplay(false);
  });
  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <div
        style={{
          padding: '5px',
          background: '#fff',
          borderRadius: '1px',
          boxShadow: '0 0 0 1px rgba(0,0,0,.1)',
          display: 'inline-block',
          cursor: 'pointer',
          position: 'relative',
        }}
        onClick={() => setDisplay((d) => !d)}
      >
        <div
          style={{
            backgroundImage:
              'linear-gradient(45deg, #dddddd 25%, transparent 25%, transparent 75%, #dddddd 75%), linear-gradient(45deg, #dddddd 25%, transparent 25%, transparent 75%, #dddddd 75%)',
            backgroundPosition: '0 0, 5px 5px',
            backgroundSize: '10px 10px',
            backgroundColor: '#fff',
            width: '50px',
            height: '14px',
            borderRadius: '2px',
          }}
        >
          <div
            style={{
              backgroundColor: `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`,
              width: '100%',
              height: '100%',
              borderRadius: '2px',
            }}
          />
        </div>
      </div>
      <div style={{ position: 'absolute', right: 0, zIndex: 1 }}>
        {display ? (
          <ChromePicker
            color={rgba}
            onChange={(c) => {
              changeColor(c.rgb);
            }}
            onChangeComplete={(c) => {
              setRgbaToStore(c.rgb);
            }}
            styles={{
              default: {
                picker: {
                  boxShadow: 'none',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: 5,
                  overflow: 'hidden',
                },
              },
            }}
          />
        ) : null}
      </div>
    </div>
  );
};
